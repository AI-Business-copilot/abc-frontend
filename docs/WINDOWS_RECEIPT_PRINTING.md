# In bill tu dong tren Windows

May in muc tieu: **EPSON TM-T82III Receipt**, da cai driver va in test thanh cong.

## Cau hinh mot lan

1. Chay `CAU-HINH-MAY-IN.cmd` trong thu muc `abc-frontend` (nhap URL web neu duoc hoi).
2. Dang nhap lai trong cua so quay moi. Day la ho so Chrome rieng, nen phien dang nhap Chrome ca nhan khong duoc sao chep.
3. Mo mot don da thanh toan, bam In hoa don. Chon **EPSON TM-T82III Receipt**, dung kho giay cuon 80/58 mm, ty le 100%, tat dau/chan trang, roi in mot bill.
4. Dong cua so xem bill va cua so quay de Chrome luu lua chon may in.

## Su dung hang ngay

1. Chay `ABC-QUAY-THU-NGAN.cmd`.
2. Trong trang Ban hang, bat **Tu in bill sau thanh toan**, chon dung kho giay.
3. Thanh toan mot don moi: sau khi API xac nhan thanh cong va tai duoc don COMPLETED, he thong goi in qua iframe. Chrome kiosk printing tu dong gui lenh in.

Khong in lai khi chi mo don cu, tai lai trang hoac quay lai bang lich su. Trang thai yeu cau in luu trong sessionStorage theo doanh nghiep va ID don. Neu ket qua in khong ro, kiem tra bill truoc khi bam **In hoa don / In lai**. Khong tu gui lai yeu cau in khi loi.

Chrome thong thuong van hien hop thoai in. Khong the bat kiosk printing bang JavaScript cua website. Launcher dung `--kiosk-printing` voi ho so Chrome rieng, khong thay doi Chrome ca nhan va may in mac dinh Windows. Launcher tu choi che do tu dong neu may in vua chon trong ho so quay khong phai Epson. Chi mo he thong ban hang duoc tin cay trong ho so quay nay.

`window.print()` khong tra ket qua giay da in hay trang thai het giay; giao dien chi bao da goi lenh in. Neu can theo doi hang doi in, trang thai thiet bi, hoac xu ly in tai nhieu quay thi can dich vu in Windows rieng.

De doi URL hoac kho giay, dong cua so quay va chay lai cau hinh. Co the truyen URL truc tiep: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-cashier.ps1 -Setup -Url http://localhost:5173`.

Tham khao: [Chromium kiosk-printing](https://github.com/chromium/chromium/blob/main/chrome/common/chrome_switches.h).
