package config

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	SessionSecret   string
	DBHost          string
	DBPort          string
	DBUser          string
	DBPassword      string
	DBName          string
	SeedPassword    string
	UploadDir       string
	MaxUploadBytes  int64
	SessionTTLHours int
	FailLimit       int
	LockSeconds     int
	ListenAddr      string
	QdrantURL       string
	VectorSize      int
	EmbedBaseURL    string
	EmbedAPIKey     string
	EmbedModel      string
	ChatBaseURL     string
	ChatAPIKey      string
	ChatModel       string
}

func Load() (*Config, error) {
	secret := os.Getenv("SESSION_SECRET")
	if secret == "" {
		return nil, fmt.Errorf("SESSION_SECRET is required")
	}
	dbPass := os.Getenv("DB_PASSWORD")
	if dbPass == "" {
		return nil, fmt.Errorf("DB_PASSWORD is required")
	}
	seed := os.Getenv("SEED_PASSWORD")
	if seed == "" {
		return nil, fmt.Errorf("SEED_PASSWORD is required")
	}
	user := getenv("DB_USER", "")
	if user == "" {
		return nil, fmt.Errorf("DB_USER is required")
	}
	name := getenv("DB_NAME", "")
	if name == "" {
		return nil, fmt.Errorf("DB_NAME is required")
	}
	maxB, _ := strconv.ParseInt(getenv("MAX_UPLOAD_BYTES", "2097152"), 10, 64)
	ttl, _ := strconv.Atoi(getenv("SESSION_TTL_HOURS", "24"))
	fl, _ := strconv.Atoi(getenv("LOGIN_FAIL_LIMIT", "8"))
	lk, _ := strconv.Atoi(getenv("LOGIN_LOCK_SECONDS", "60"))
	return &Config{
		SessionSecret:   secret,
		DBHost:          getenv("DB_HOST", "db"),
		DBPort:          getenv("DB_PORT", "3306"),
		DBUser:          user,
		DBPassword:      dbPass,
		DBName:          name,
		SeedPassword:    seed,
		UploadDir:       getenv("UPLOAD_DIR", "/data/uploads"),
		MaxUploadBytes:  maxB,
		SessionTTLHours: ttl,
		FailLimit:       fl,
		LockSeconds:     lk,
		ListenAddr:      getenv("LISTEN_ADDR", ":8080"),
		QdrantURL:       getenv("QDRANT_URL", "http://qdrant:6333"),
		VectorSize:      atoi(getenv("VECTOR_SIZE", "384")),
		EmbedBaseURL:    os.Getenv("EMBEDDING_BASE_URL"),
		EmbedAPIKey:     os.Getenv("EMBEDDING_API_KEY"),
		EmbedModel:      getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
		ChatBaseURL:     os.Getenv("CHAT_BASE_URL"),
		ChatAPIKey:      os.Getenv("CHAT_API_KEY"),
		ChatModel:       getenv("CHAT_MODEL", "gpt-4o-mini"),
	}, nil
}

func atoi(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}

func getenv(k, d string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return d
}

func (c *Config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&collation=utf8mb4_unicode_ci",
		c.DBUser, c.DBPassword, c.DBHost, c.DBPort, c.DBName)
}
