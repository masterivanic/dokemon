package handler

import "github.com/dokemon-ng/dokemon/pkg/server/model"

type userResponse struct {
	Username     string `json:"username"`
	PasswordHash string `json:"passwordHash"`
	Id           uint   `json:"id"`
}

func newUserResponse(m *model.User) *userResponse {
	return &userResponse{
		Id:       m.Id,
		Username: m.UserName,
	}
}

type userHead struct {
	Username string `json:"username"`
	Id       uint   `json:"id"`
}

func newUserHeadList(rows []model.User) []userHead {
	headRows := make([]userHead, len(rows))
	for i, r := range rows {
		headRows[i] = userHead{
			Id:       r.Id,
			Username: r.UserName,
		}
	}
	return headRows
}

type userCountResponse struct {
	Count int64 `json:"count"`
}

func newUserCountResponse(count int64) *userCountResponse {
	return &userCountResponse{
		Count: count,
	}
}
