package excel

import (
	"excel_cal/model"
	"fmt"
	"github.com/xuri/excelize/v2"
)

type ExcelOperator struct {
	Filepath  string
	SheetName string
}

// Read 读取文件
func (e *ExcelOperator) Read() ([]model.Material, error) {
	f, err := excelize.OpenFile(e.Filepath)
	if err != nil {
		fmt.Println(err)

	}

	defer func() {
		// Close the spreadsheet.
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()
	//// Get value from cell by given worksheet name and cell reference.
	//cell, err := f.GetCellValue("Sheet1", "B2")
	//if err != nil {
	//	fmt.Println(err)
	//}
	//fmt.Println(cell)
	// Get all the rows in the Sheet1.
	rows, err := f.GetRows(e.SheetName)
	if err != nil {
		fmt.Println(err)
	}
	//for _, row := range rows {
	//	for _, colCell := range row {
	//		fmt.Print(colCell, "\t")
	//	}
	//	fmt.Println()
	//}
	return DataVerify(rows)
}

func (e *ExcelOperator) Write() error {
	return nil
}

// NewFile 新增excel文件
func (e *ExcelOperator) NewFile(forges []model.Forge) error {
	f := excelize.NewFile()
	defer func() {
		if err := f.Close(); err != nil {
			fmt.Println(err)
		}
	}()
	// Create a new sheet.
	index, err := f.NewSheet("Sheet1")
	if err != nil {
		fmt.Println(err)
		return nil
	}
	f.SetDefaultFont("Arial Black")
	// 设置头部行
	e.SetHeaderRow(f)

	// 解析内容
	content, mergeContent := e.ParContent(forges)

	// 写入内容
	e.SetRowContent(f, content)

	// 合并单元格
	e.MergeCellContent(f, mergeContent)

	// 设置单元格样式

	f.SetActiveSheet(index)

	if err := f.SaveAs("Book1.xlsx"); err != nil {
		fmt.Println(err)
	}
	return nil
}

// SetCellStyle 设置单元格样式
func (e *ExcelOperator) SetCellStyle() {

}

// MergeCellContent 合并单元格内容
func (e *ExcelOperator) MergeCellContent(f *excelize.File, merge map[string]string) {
	for k, v := range merge {
		f.MergeCell(e.SheetName, k, v)
	}
}

// ParContent 解析单元格内容
func (e *ExcelOperator) ParContent(forges []model.Forge) ([]map[string]interface{}, map[string]string) {
	rowIndex := 2
	var content = make([]map[string]interface{}, 0)
	var mergeContent = make(map[string]string)
	for _, forge := range forges {
		startRow := rowIndex
		for _, mal := range forge.Ms {
			var cMap = map[string]interface{}{
				fmt.Sprintf("A%d", rowIndex): forge.ForgeSize,
				//fmt.Sprintf("B%d", rowIndex): forge.InThickness,
				//fmt.Sprintf("C%d", rowIndex): forge.InWidth,
				//fmt.Sprintf("D%d", rowIndex): forge.InLength,
				fmt.Sprintf("B%d", rowIndex): mal.GetForSize(),
				fmt.Sprintf("C%d", rowIndex): mal.Demand,
				fmt.Sprintf("D%d", rowIndex): mal.Order,
				fmt.Sprintf("E%d", rowIndex): mal.Piece,

				fmt.Sprintf("F%d", rowIndex): mal.Priority,
				fmt.Sprintf("G%d", rowIndex): mal.StartTime,
				fmt.Sprintf("H%d", rowIndex): mal.EedTime,
				fmt.Sprintf("I%d", rowIndex): mal.Content,
			}
			content = append(content, cMap)
			rowIndex += 1
		}

		mergeContent[fmt.Sprintf("A%d", startRow)] = fmt.Sprintf("A%d", len(forge.Ms)+startRow-1)
	}
	return content, mergeContent
}

// SetRowContent 设置物料信息
func (e *ExcelOperator) SetRowContent(f *excelize.File, cList []map[string]interface{}) {
	for _, cMap := range cList {
		for k, v := range cMap {
			f.SetCellValue(e.SheetName, k, v)
		}

	}
}

// SetHeaderRow 设置头部行
func (e *ExcelOperator) SetHeaderRow(file *excelize.File) {
	for i, k := range model.ColumnIndex {
		file.SetCellValue(e.SheetName, fmt.Sprintf("%s%d", k, 1), model.HeaderList[i])
	}

}

func NewExcel() *ExcelOperator {
	return &ExcelOperator{Filepath: "计算表.xlsx", SheetName: "Sheet1"}
}

// GenderExcel 生成excel文档
func (e *ExcelOperator) GenderExcel() error {
	// 读取文件
	materials, err := e.Read()
	if err != nil {
		return err
	}
	// 计算锻造尺寸
	forges := e.cal(materials)

	//
	e.NewFile(forges)

	return nil
}

// cal 计算
func (e *ExcelOperator) cal(materials []model.Material) []model.Forge {
	// 分组
	grouping := Grouping(materials)
	// 计算锻造
	return CalForge(grouping)
}

// SetExcelHeader 设置文件头行
func (e *ExcelOperator) SetExcelHeader() {

}

//// 自定义方法：设置单元格的字体和大小
//func SetCellFont(f *excelize.File, sheet, cell, fontFamily string, fontSize int) {
//	// 创建字体样式
//	style, err := f.NewStyle(fmt.Sprintf(`{"font":{"family":"%s","size":%d}}`, fontFamily, fontSize))
//	if err != nil {
//		fmt.Println("创建字体样式失败:", err)
//		return
//	}
//
//	// 将字体样式应用于指定的单元格
//	if err := f.SetCellStyle(sheet, cell, cell, style); err != nil {
//		fmt.Println("设置单元格样式失败:", err)
//		return
//	}
//}
