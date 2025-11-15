package model

import (
	"fmt"
	"github.com/go-gormigrate/gormigrate/v2"
	"gorm.io/gorm"
)

// MigrateDb 迁移函数
func MigrateDb(db *gorm.DB) {
	run(db)

}

// run 执行数据迁移
func run(db *gorm.DB) {
	m := gormigrate.New(db, migrateOpts(), MigrateFuncMapToList(MigrateFuncMap))
	if err := m.Migrate(); err != nil {
		fmt.Print(err.Error())
	}
	fmt.Print("mysql: 数据迁移成功")
}

// migrateOpts 自定义配置
func migrateOpts() *gormigrate.Options {
	return &gormigrate.Options{
		TableName:                 "migrations",
		IDColumnName:              "id",
		IDColumnSize:              255,
		UseTransaction:            false,
		ValidateUnknownMigrations: true,
	}
}

// MigrateFuncMapToList ...
func MigrateFuncMapToList(m map[string]func(tx *gorm.DB) error) []*gormigrate.Migration {
	Migrations := []*gormigrate.Migration{}
	for k, f := range m {
		Migrations = append(Migrations, &gormigrate.Migration{ID: k, Migrate: f, Rollback: nil})
	}
	return nil
}

var MigrateFuncMap = map[string]func(tx *gorm.DB) error{
	"20230702": ModelMigrate20230702,
}

// ModelMigrate20230702 ...
func ModelMigrate20230702(tx *gorm.DB) error {
	tx.AutoMigrate(&CronTask{})
	return nil
}
