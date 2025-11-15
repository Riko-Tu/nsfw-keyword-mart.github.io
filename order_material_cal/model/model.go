package model

import (
	"fmt"
)

// Material 物料规格
type Material struct {
	Id        int    // ID
	Piece     int    // 序号
	Thickness int    // 厚度
	Width     int    // 宽
	Length    int    // 长
	Num       int    // 件数
	Type      string // 棒 ？ 方块
	States    string // 状态 ： 取消、未锻造、锻造中、部分发货、已发货、补货
	Priority  string // 优先级  : 正常、加急
	GroupId   int    // 分组id
	Order     string // 采购单号
	StartTime string // 下单时间
	EedTime   string // 需求时间
	MyOrderID string // 出仓字号
	Demand    string // 需求商
	Content   string // 备注

}

// GetForSize 获取规格型号
func (m *Material) GetForSize() string {
	if m.Type == Diamond {
		return fmt.Sprintf("%d*【%d*%d】*%d", m.Thickness, m.Width, m.Length, m.Num)

	} else {
		return fmt.Sprintf("D%d*【%d*%d】*%d", m.Thickness, m.Width, m.Length, m.Num)
	}
}

// SizeSort 尺寸调换
func (m *Material) SizeSort() {
	var temp int
	if m.Type == Pole {
		return
	}
	if m.Width < m.Thickness {
		temp = m.Width
		m.Width = m.Thickness
		m.Thickness = temp
	}
	if m.Length < m.Width {
		temp = m.Length
		m.Length = m.Width
		m.Width = temp
	}
}

// Forge 锻造表
type Forge struct {
	Ms          []Material // 合并物料
	ForgeSize   string     // 熔锻规格
	Thickness   int        // 厚度
	Width       int        // 宽
	Length      int        // 长
	MinLength   int        // 最低长度
	InLength    int        // 长度+
	InWidth     int        // 宽度+
	InThickness int        // 厚度+

}

// ForgeSize 锻造规格
type ForgeSize struct {
	Thickness, Width, length, Weight int
	Type                             string
	Num                              int // 合并数量
	SizeNum                          int // 锻造数量

}

func (f *ForgeSize) GetLength() int {
	return f.length
}

// AddDiamondLength 添加方块长度
func (f *ForgeSize) AddDiamondLength(len int) error {
	forsize := f.length + len
	tempNum := f.Num + 1
	if forsize > 1200 {
		return fmt.Errorf("")
	}
	if err := f.calDiamondWeight(forsize, tempNum); err != nil {
		return err
	}

	f.length = forsize
	f.Num = tempNum
	return nil
}
func (f *ForgeSize) AddLength(len int) error {
	if f.Type == Diamond {
		// 计算方块
		err := f.AddDiamondLength(len)
		if err != nil {
			return err
		}
	} else {
		// 计算圆棒
		err := f.AddPoleLength(len)
		if err != nil {
			return err
		}
	}

	return nil
}

func (f *ForgeSize) calPoledWeight(Len, num int) error {
	//radius := f.Thickness / 2.0
	//area := math.Pi * math.Pow(float64(radius), 2)
	//temp := (int(area) + 1) * Len * 9 / 1000000 / 2.0
	//
	temp := int(float64(f.Thickness)*float64(f.Thickness)*0.785*9*float64(Len)/1000000) + 1

	if temp > 50 && num != 1 {
		return fmt.Errorf("重量过大")
	}
	fmt.Println(temp)
	f.Weight = temp
	return nil
}

// AddPoleLength 计算圆棒长度
func (f *ForgeSize) AddPoleLength(len int) error {
	// 先计算增加后的长度
	forsize := f.Width + len
	tempNum := f.Num + 1
	if forsize > 1200 {
		return fmt.Errorf("")
	}
	if err := f.calPoledWeight(forsize, tempNum); err != nil {
		return err
	}

	f.Width = forsize
	f.Num = tempNum
	return nil
}

func (f *ForgeSize) Over(len int) {
	f.Num = 1
	if f.Type == Diamond {
		f.length = len
	} else {
		f.Width = len
	}

}

// calDiamondWeight 计算重量(净重)
func (f *ForgeSize) calDiamondWeight(Len, num int) error {
	temp := f.Thickness * f.Width * Len * 9 / 1000000
	if temp > 50 && num != 1 {
		return fmt.Errorf("")
	}
	f.Weight = temp
	return nil
}

const (
	Diamond = "方块"
	Pole    = "圆棒"
	Pi      = 3.14
)
