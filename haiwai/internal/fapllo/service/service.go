package server

import (
	"github.com/gin-gonic/gin"
	"github/turan/haiwai/internal/fapllo/logic"
)

// FaplloServiceInit 初始化服务
func FaplloServiceInit(engin *gin.Engine) {
	f := logic.FEngin
	engin.GET("/RestartCronUrlTask", f.RestartCronUrlTask)
}
