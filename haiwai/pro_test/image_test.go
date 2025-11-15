package pro_test

import (
	"fmt"
	"log"
	"net/http"
	"testing"

	"github.com/PuerkitoBio/goquery"
)

func TestImage(t *testing.T) {
	// 发起HTTP请求获取页面内容
	res, err := http.Get("https://fapello.com/alina-becker/")
	if err != nil {
		log.Fatal(err)
	}
	defer res.Body.Close()

	// 解析HTML文档
	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		log.Fatal(err)
	}

	// 查找id为"content"的div标签下的所有img标签
	doc.Find("div#content img").Each(func(i int, img *goquery.Selection) {
		src, exists := img.Attr("src")
		if exists {
			fmt.Println(src)
		}
	})
}
