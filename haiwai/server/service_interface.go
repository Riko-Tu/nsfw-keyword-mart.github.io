package model

// Service接口，所有的服务都需要实现这个接口
type Service interface {
	Start() error
	Stop() error
}
