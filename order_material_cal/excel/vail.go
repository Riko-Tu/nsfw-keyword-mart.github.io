package excel

import (
	"excel_cal/model"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// DataVerify 二维数组校验
func DataVerify(data [][]string) ([]model.Material, error) {
	// 数据判空

	mDiamond := make([]model.Material, 0)
	mQold := make([]model.Material, 0)
	materials := make([]model.Material, 0)
	for i := 1; i < len(data); i++ {

		if data[i][0] != "" {
			// 第一列为空
			items := extractNumbers(data[i][0])
			d := model.Material{}
			for _, item := range items {
				d.Thickness = item[0]
				d.Width = item[1]
				d.Length = item[2]
				d.Num = item[len(item)-1]
				if d.Length == 0 {
					d.Type = model.Pole
				} else {
					d.Type = model.Diamond
				}
				d.SizeSort()
				if d.Type == model.Diamond {
					mDiamond = append(mDiamond, d)
					continue
				}
				mQold = append(mQold, d)
			}

		}

	}
	mDiamondListSort := MaterialListSort(mDiamond)
	mQoldmListSort := MaterialListSort(mQold)
	materials = append(materials, mDiamondListSort...)
	materials = append(materials, mQoldmListSort...)
	return materials, nil

}

// MaterialListSort 多关键字排序
func MaterialListSort(materials []model.Material) []model.Material {
	// 自定义排序函数
	sort.SliceStable(materials, func(i, j int) bool {
		// 首先按照 Thickness 进行排序
		if materials[i].Thickness != materials[j].Thickness {
			return materials[i].Thickness < materials[j].Thickness
		}

		// 如果 Thickness 相等，则按照 Width 进行排序
		return materials[i].Width < materials[j].Width
	})
	return materials

}

// extractNumbers 获取尺寸
func extractNumbers(input string) [][]int {
	re := regexp.MustCompile(`\d+`)
	inputList := strings.Split(input, "\n")
	twoInput := make([][]int, 0)
	for _, k := range inputList {
		matches := re.FindAllString(k, -1)
		numbers := make([]int, 0)
		for _, match := range matches {
			num, _ := strconv.Atoi(match)
			numbers = append(numbers, num)
		}
		twoInput = append(twoInput, numbers)
	}

	return twoInput
}

// Grouping 分组
func Grouping(mas []model.Material) map[int][]model.Material {
	groupId := 1
	var minM = mas[0]
	materials := make([]model.Material, 0)
	minM.GroupId = groupId
	materials = append(materials, minM)
	for i := 1; i < len(mas); i++ {
		m := mas[i]
		if int(math.Abs(float64(m.Thickness-minM.Thickness))) <= 5 &&
			int(math.Abs(float64(m.Width-minM.Width))) <= 5 &&
			m.Type == minM.Type {
			m.GroupId = minM.GroupId
		} else {
			groupId += 1
			m.GroupId = groupId
			minM = m
		}
		materials = append(materials, m)
	}
	groups := make(map[int][]model.Material)
	for _, material := range materials {
		groupId = material.GroupId
		groups[groupId] = append(groups[groupId], material)
	}
	return groups
}

// CalForge 计算热打规格
func CalForge(materialMap map[int][]model.Material) []model.Forge {
	forges := make([]model.Forge, 0)
	for _, v := range materialMap {
		forge := model.Forge{}
		//   获取锻造规格
		forSize := GetForgeSize(v)
		forge.Ms = v
		distinctForSize := forSizeListDistinct(forSize)
		forge.ForgeSize = getForgeSize(distinctForSize)
		forges = append(forges, forge)
		fmt.Println(fmt.Sprintf("%#v", forge))
	}
	return forges
}
func getForgeSize(sizes []model.ForgeSize) string {
	var sizeList = make([]string, len(sizes))
	for _, k := range sizes {
		str := ""
		if k.Type == model.Diamond {
			str = fmt.Sprintf("%dkg %d*【%d*%d】*%d", k.Weight, k.Thickness, k.Width, k.GetLength(), k.SizeNum)
		} else {
			str = fmt.Sprintf("%dkg D%d*【%d*%d】*%d", k.Weight, k.Thickness, k.Width, k.GetLength(), k.SizeNum)
		}
		sizeList = append(sizeList, str)
	}
	fmt.Println("ForgeSize:", sizeList)
	return strings.Join(sizeList, "\n")
}

// forSizeListDistinct 数组去重
func forSizeListDistinct(sizes []model.ForgeSize) []model.ForgeSize {
	mergedSizes := make(map[string]model.ForgeSize)

	for _, size := range sizes {
		key := fmt.Sprintf("%d-%d-%d", size.Thickness, size.Width, size.GetLength())

		if existingSize, ok := mergedSizes[key]; ok {
			existingSize.SizeNum += size.SizeNum
			mergedSizes[key] = existingSize
		} else {
			mergedSizes[key] = size
		}
	}

	merged := make([]model.ForgeSize, 0, len(mergedSizes))
	for _, size := range mergedSizes {
		merged = append(merged, size)
	}
	return merged
}

// GetForgeSize  获取锻造规格
func GetForgeSize(v []model.Material) []model.ForgeSize {
	forsizeList := make([]model.ForgeSize, 0)
	// 最大厚度，最大宽度，最小长度
	var th, wid int

	// 获取本组内最大的厚度和宽度
	for _, material := range v {

		if th < material.Thickness {
			th = material.Thickness
		}
		if wid < material.Width {
			wid = material.Width
		}
	}
	//
	fs := model.ForgeSize{SizeNum: 1} //Num: 1,

	for _, material := range v {
		fs.Type = material.Type
		fs.Thickness = th
		for i := 0; i < material.Num; i++ {
			var malLen int
			if material.Type == model.Diamond {

				fs.Width = wid
				malLen = material.Length
			}
			if material.Type == model.Pole {
				malLen = material.Width
			}

			err := fs.AddLength(malLen)
			if err != nil {
				// 无法拼接，直接加入
				forsizeList = append(forsizeList, fs)
				// 重置fs
				fs.Over(malLen)
			}
		}
	}
	forsizeList = append(forsizeList, fs)
	return forsizeList
}
