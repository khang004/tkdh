// Bảng giá bán hiện tại theo mã sản phẩm.
window.productPrices = {1: 890000, 2: 150000, 3: 180000, 4: 4200000, 5: 290000, 6: 390000, 7: 250000, 8: 190000, 9: 250000, 10: 180000, 11: 250000, 12: 190000};

// Tạo URL ảnh theo vị trí website hiện tại, tránh dùng lại URL cũ từ giỏ hàng.
window.productImages = Object.fromEntries(Object.entries({"1": "vong-tram-108-hat.jpg", "2": "nu-tram-huong.jpg", "3": "nhang-tram-moc-huong.png", "4": "vong-tram-boc-vang.png", "5": "ke-nu-tram-trang-khuyet.jpg", "6": "bot-tram-huong.png", "7": "ke-nu-tram-dang-moc.jpg", "8": "lu-xong-tram-hoa-tiet.jpg", "9": "lu-xong-tram-sac-nau.jpg", "10": "nhang-tram-huong.jpg", "11": "nhang-moc-huong-hop-tru.png", "12": "nu-tram-moc-huong-hop-qua.png"}).map(([id, name]) => [id, new URL('../image/' + name, document.currentScript.src).href]));
