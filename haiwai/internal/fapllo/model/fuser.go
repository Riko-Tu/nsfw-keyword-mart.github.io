package model

type FUser struct {
	UserID           int    `gorm:"column:userid,primaryKey"`
	UserName         string `gorm:"column:user_name;type:varchar(64);content:'用户名'"` // 用户名
	MediaNum         int    // 媒体数
	CountPage        int    // 总页数
	OtherApp         string `gorm:"column:other_app;type:varchar(256);content:'其他平台'"`         // 其他平台
	OtherAppUserName string `gorm:"column:other_app_name;type:varchar(256);content:'其他平台用户名'"` // 其他平台的用户名
}

func (f *FUser) TableName() string {

	return "fuser"
}
