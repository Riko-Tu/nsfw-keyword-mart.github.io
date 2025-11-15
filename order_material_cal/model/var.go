package model

var ExcelHeaderMap = map[string]string{
	"A": "熔锻规格",
	"B": "规格型号",
	"C": "厚度+",
	"D": "宽度+",
	"E": "长度+",
	"F": "需求商",
	"G": "采购单号",
	"H": "序号",
	"I": "优先级",
	"J": "下单时间",
	"K": "需求时间",
	"L": "备注",
}
var HeaderList = []string{
	"熔锻规格", "规格型号", "需求商", "采购单号", "序号",
	"优先级", "下单时间", "需求时间", "备注",
}
var AllColumnIndex = []string{
	"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "N",
	"M", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
}

var ColumnIndex = []string{
	"A", "B", "C", "D", "E", "F", "G", "H", "I",
}
