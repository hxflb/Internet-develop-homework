package qdrant

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	base   string
	http   *http.Client
	coll   string
	dim    int
}

func New(base string, dim int) *Client {
	return &Client{base: trim(base), http: &http.Client{Timeout: 15 * time.Second}, coll: "campusclaw_chunks", dim: dim}
}

func (c *Client) Ready() error {
	res, err := c.http.Get(c.base + "/readyz")
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode >= 300 {
		return fmt.Errorf("qdrant %d", res.StatusCode)
	}
	return nil
}

func (c *Client) Ensure() error {
	body, _ := json.Marshal(map[string]any{
		"vectors": map[string]any{"size": c.dim, "distance": "Cosine"},
	})
	req, _ := http.NewRequest(http.MethodPut, c.base+"/collections/"+c.coll, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	io.Copy(io.Discard, res.Body)
	if res.StatusCode >= 300 && res.StatusCode != 409 {
		return fmt.Errorf("ensure collection %d", res.StatusCode)
	}
	return nil
}

func (c *Client) Upsert(id int64, vec []float32, payload map[string]any) error {
	body, _ := json.Marshal(map[string]any{
		"points": []map[string]any{{"id": id, "vector": vec, "payload": payload}},
	})
	req, _ := http.NewRequest(http.MethodPut, c.base+"/collections/"+c.coll+"/points?wait=true", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	io.Copy(io.Discard, res.Body)
	if res.StatusCode >= 300 {
		return fmt.Errorf("qdrant upsert %d", res.StatusCode)
	}
	return nil
}

func (c *Client) DeleteByMaterial(materialID int) error {
	body, _ := json.Marshal(map[string]any{
		"filter": map[string]any{
			"must": []map[string]any{{"key": "material_id", "match": map[string]any{"value": materialID}}},
		},
	})
	return c.postJSON("/collections/"+c.coll+"/points/delete?wait=true", body)
}

type Hit struct {
	ID    int64
	Score float64
}

func (c *Client) Search(vec []float32, classID int, limit int, minScore float64) ([]Hit, error) {
	body, _ := json.Marshal(map[string]any{
		"vector":          vec,
		"limit":           limit,
		"score_threshold": minScore,
		"with_payload":    false,
		"filter": map[string]any{
			"must": []map[string]any{{"key": "class_id", "match": map[string]any{"value": classID}}},
		},
	})
	req, _ := http.NewRequest(http.MethodPost, c.base+"/collections/"+c.coll+"/points/search", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	raw, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 300 {
		return nil, fmt.Errorf("search %d: %s", res.StatusCode, raw)
	}
	var out struct {
		Result []struct {
			ID    json.Number `json:"id"`
			Score float64     `json:"score"`
		} `json:"result"`
	}
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, err
	}
	hits := make([]Hit, 0, len(out.Result))
	for _, r := range out.Result {
		id, _ := r.ID.Int64()
		hits = append(hits, Hit{ID: id, Score: r.Score})
	}
	return hits, nil
}

func (c *Client) postJSON(path string, body []byte) error {
	req, _ := http.NewRequest(http.MethodPost, c.base+path, bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	res, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	io.Copy(io.Discard, res.Body)
	if res.StatusCode >= 300 {
		return fmt.Errorf("qdrant post %d", res.StatusCode)
	}
	return nil
}

func trim(s string) string {
	for len(s) > 0 && s[len(s)-1] == '/' {
		s = s[:len(s)-1]
	}
	return s
}
