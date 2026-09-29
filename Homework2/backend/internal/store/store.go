package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"

	"campusclaw/internal/config"
)

func Open(cfg *config.Config) (*sql.DB, error) {
	var db *sql.DB
	var err error
	for i := 0; i < 40; i++ {
		db, err = sql.Open("mysql", cfg.DSN())
		if err == nil {
			if ping := db.Ping(); ping == nil {
				return db, nil
			} else {
				err = ping
			}
		}
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("db not ready: %w", err)
}

func Init(ctx context.Context, db *sql.DB, cfg *config.Config) error {
	if err := os.MkdirAll(cfg.UploadDir, 0o755); err != nil {
		return err
	}
	stmts := []string{
		`CREATE TABLE IF NOT EXISTS classes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(64) NOT NULL UNIQUE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS users (
			id INT AUTO_INCREMENT PRIMARY KEY,
			username VARCHAR(64) NOT NULL UNIQUE,
			password_hash VARCHAR(255) NOT NULL,
			role ENUM('teacher','student') NOT NULL,
			class_id INT NOT NULL,
			INDEX idx_users_class (class_id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS sessions (
			id CHAR(64) PRIMARY KEY,
			user_id INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			expires_at TIMESTAMP NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS materials (
			id INT AUTO_INCREMENT PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			class_id INT NOT NULL,
			file_path VARCHAR(512) NOT NULL,
			uploaded_by INT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_mat_class (class_id),
			FOREIGN KEY (class_id) REFERENCES classes(id),
			FOREIGN KEY (uploaded_by) REFERENCES users(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS knowledge_entries (
			id INT AUTO_INCREMENT PRIMARY KEY,
			material_id INT NOT NULL,
			class_id INT NOT NULL,
			body_text MEDIUMTEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_ke_class (class_id),
			FOREIGN KEY (material_id) REFERENCES materials(id),
			FOREIGN KEY (class_id) REFERENCES classes(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS knowledge_chunks (
			id BIGINT AUTO_INCREMENT PRIMARY KEY,
			knowledge_entry_id INT NOT NULL,
			material_id INT NOT NULL,
			class_id INT NOT NULL,
			chunk_index INT NOT NULL,
			chunk_text MEDIUMTEXT NOT NULL,
			char_start INT NOT NULL,
			char_end INT NOT NULL,
			index_status VARCHAR(16) NOT NULL DEFAULT 'pending',
			strategy VARCHAR(16) NOT NULL DEFAULT 'auto',
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			INDEX idx_chunk_class (class_id, index_status),
			INDEX idx_chunk_mat (material_id),
			FULLTEXT INDEX ft_chunk (chunk_text) WITH PARSER ngram,
			FOREIGN KEY (knowledge_entry_id) REFERENCES knowledge_entries(id) ON DELETE CASCADE,
			FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS lectures (
			id INT AUTO_INCREMENT PRIMARY KEY,
			class_id INT NOT NULL,
			title VARCHAR(255) NOT NULL,
			INDEX idx_lec_class (class_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS homework (
			id INT AUTO_INCREMENT PRIMARY KEY,
			class_id INT NOT NULL,
			title VARCHAR(255) NOT NULL,
			INDEX idx_hw_class (class_id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS assistants (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(64) NOT NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
		`CREATE TABLE IF NOT EXISTS skills (
			id INT AUTO_INCREMENT PRIMARY KEY,
			name VARCHAR(64) NOT NULL
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
	}
	for _, s := range stmts {
		if _, err := db.ExecContext(ctx, s); err != nil {
			return err
		}
	}
	return seed(ctx, db, cfg)
}

func seed(ctx context.Context, db *sql.DB, cfg *config.Config) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(cfg.SeedPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := db.ExecContext(ctx, `INSERT IGNORE INTO classes (id, name) VALUES (1, 'A 班'), (2, 'B 班')`); err != nil {
		return err
	}
	users := []struct {
		u, role string
		cid     int
	}{
		{"teacher_a", "teacher", 1},
		{"student_a1", "student", 1},
		{"student_b1", "student", 2},
	}
	for _, u := range users {
		_, err := db.ExecContext(ctx, `INSERT IGNORE INTO users (username, password_hash, role, class_id) VALUES (?, ?, ?, ?)`,
			u.u, string(hash), u.role, u.cid)
		if err != nil {
			return err
		}
	}
	var n int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM materials`).Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}
	var teacherID int
	if err := db.QueryRowContext(ctx, `SELECT id FROM users WHERE username='teacher_a'`).Scan(&teacherID); err != nil {
		return err
	}
	seeds := []struct {
		title, body string
		cid         int
		file        string
	}{
		{"A 班春季教研材料", "A 班春季教研材料：本周作文讲评要点。", 1, "seed-a.txt"},
		{"B 班春季教研材料", "B 班春季教研材料：本周阅读理解训练。", 2, "seed-b.txt"},
	}
	for _, s := range seeds {
		path := cfg.UploadDir + "/" + s.file
		if err := os.WriteFile(path, []byte(s.body+"\n"), 0o644); err != nil {
			return err
		}
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return err
		}
		res, err := tx.ExecContext(ctx, `INSERT INTO materials (title, class_id, file_path, uploaded_by) VALUES (?, ?, ?, ?)`,
			s.title, s.cid, path, teacherID)
		if err != nil {
			tx.Rollback()
			return err
		}
		mid, _ := res.LastInsertId()
		if _, err := tx.ExecContext(ctx, `INSERT INTO knowledge_entries (material_id, class_id, body_text) VALUES (?, ?, ?)`,
			mid, s.cid, s.body); err != nil {
			tx.Rollback()
			return err
		}
		if err := tx.Commit(); err != nil {
			return err
		}
	}
	return nil
}
