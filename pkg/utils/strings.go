package utils

import (
	"math/rand"
	"time"
)

var characters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")

func RandomSequence(n int) string {
	b := make([]rune, n)
	rand.Seed(time.Now().UnixNano())
	for i := range b {
		b[i] = characters[rand.Intn(len(characters))]
	}
	return string(b)
}
