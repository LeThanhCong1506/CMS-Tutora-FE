# Đặc tả tính năng: Quản lý Tài chính & Thuế cho Gia sư (Admin CMS)

> Tài liệu mục lục tính năng, dùng làm cơ sở thiết kế UI/wireframe và lên kế hoạch triển khai.
> Cập nhật: 2026-07-28 — bổ sung nghiên cứu pháp lý thuế TNCN/GTGT, nghĩa vụ khấu trừ, và rà soát kiến trúc BE/DB thật (mục E).

## Bối cảnh hiện trạng (tham chiếu code)

- Backend: ASP.NET Core 8, layered architecture, PostgreSQL. Payment gateway: PayOS.
- Đã có: `Booking` (tách phí platform/parent/tutor), `Wallet`/`Wallettransaction`, `PaymentTransaction`, `Withdrawalrequest` (duyệt thủ công), `SettlementService` (giải ngân escrow), `BookingFeeCalculator` (hoa hồng hardcode 5%/5%).
- CMS đã có: `AdminFinancialsPage` (dashboard + ledger), `AdminPayout` (duyệt rút tiền).
- **Bản đề xuất UI (mock data, chưa nối BE thật)** đã dựng tại `/admin-portal/finance-new` (`AdminFinanceNew`) và `/admin-portal/tax` (`AdminTax`) — cover phần lớn mục A4/A5/A7/A8/A9/A11 và B1–B6 bên dưới ở dạng preview để duyệt UX trước khi build thật.
- Chưa có ở BE: bất kỳ trường/luồng nào liên quan MST, khấu trừ thuế TNCN, kê khai thuế, chứng từ khấu trừ, đối soát/thanh khoản.

---

## A. QUẢN LÝ TÀI CHÍNH

| # | Tính năng | Mô tả | Trạng thái |
|---|---|---|---|
| A1 | Tổng quan tài chính | Dashboard: tổng doanh thu, hoa hồng nền tảng, tiền trong escrow, tổng đã chi trả, biểu đồ theo thời gian | Đã có (`AdminFinancialsPage`) |
| A2 | Sổ cái giao dịch (Ledger) | Danh sách wallet transactions, lọc theo loại/trạng thái/thời gian/người dùng | Đã có (`TransactionLedger`) |
| A3 | Giao dịch thanh toán thực | Danh sách `PaymentTransaction` qua PayOS, trạng thái đối soát | Đã có (`/payment-transactions`) |
| A4 | Cấu hình hoa hồng nền tảng | % phí phụ huynh / % phí gia sư — hiện hardcode 5%/5% trong `BookingFeeCalculator.cs` | UI đề xuất xong (mock) — `AdminFinanceNew` tab "Cấu hình hoa hồng"; cần nối API thật |
| A5 | Quản lý Escrow | Theo dõi tiền giữ hộ theo booking, can thiệp thủ công khi tranh chấp | UI đề xuất xong (mock) — tab "Escrow" |
| A6 | Quản lý rút tiền (Payout) | Danh sách yêu cầu, claim/approve/reject, đính kèm minh chứng chuyển khoản | Đã có (`AdminPayout`) |
| A7 | Quản lý hoàn tiền (Refund) | Danh sách yêu cầu hoàn tiền, xử lý tranh chấp phụ huynh–gia sư | UI đề xuất xong (mock) — tab "Hoàn tiền" |
| A8 | ~~Xác minh tài khoản ngân hàng gia sư~~ | **Đã bỏ khỏi phạm vi (2026-07-28).** Nền tảng từng có xác minh tự động qua PayOS (micro-deposit) và **đã chủ động gỡ bỏ** (migration `V20260708__remove_payos_payout_and_bank_verification.sql`), chuyển hẳn sang duyệt thủ công + `completion_note` bắt buộc khi Staff xác nhận đã chuyển khoản. Thời điểm kiểm tra hợp lý là lúc duyệt payout (đã có sẵn), không cần 1 màn hình "trạng thái xác minh" đứng riêng — làm vậy chỉ lặp lại việc staff đã làm mà không có API xác minh thật đứng sau. | Không cần xây — loại khỏi scope |
| A9 | Báo cáo tài chính | Xuất báo cáo doanh thu theo kỳ / theo gia sư / theo môn học (Excel, PDF) | UI đề xuất xong (mock, chưa export thật) — tab "Báo cáo" |
| A10 | Cảnh báo & đối soát bất thường | Cảnh báo hệ thống (giao dịch treo, chênh lệch đối soát PayOS) | Một phần (`/system-alerts`) — **lưu ý**: bảng `system_alerts`/`SystemAlertService` đã có sẵn ở BE nhưng `CreateAlertAsync()` **không được gọi ở bất kỳ đâu** (grep xác nhận) — hạ tầng có nhưng chưa có detector nào ghi dữ liệu vào. Badge "escrow treo >X ngày" từng đề xuất trong `AdminFinanceNew` đã bị bỏ vì không có logic BE thật đứng sau (xem mục E) |
| A11 | **Thanh khoản & đối soát (mới)** | So sánh tiền ngân hàng thật vs tổng nghĩa vụ (escrow + ví gia sư + yêu cầu rút chờ xử lý); tiền PayOS chưa settle; dòng tiền vào/ra theo kỳ; đối soát 3 chiều PayOS ↔ ledger nội bộ ↔ ngân hàng. **Đây là khoảng trống lớn nhất trước khi bổ sung** — BE đã có sẵn field `PaymentTransaction.Reconciliationstatus` nhưng chưa từng hiển thị ở CMS. | UI đề xuất xong (mock) — tab "Thanh khoản & đối soát" |

## B. QUẢN LÝ THUẾ (mới hoàn toàn)

| # | Tính năng | Mô tả | Trạng thái |
|---|---|---|---|
| B1 | Hồ sơ thuế gia sư | Định danh lấy trực tiếp từ **CCCD đã xác minh khi duyệt hồ sơ gia sư** (không thu thập lại). **Đã bỏ trường "loại hình" (cá nhân/hộ kinh doanh)** — xác nhận Mẫu 01-1/BK-CNKD (TT40/2021) và Mẫu 01-1/BK-CNKD-TMĐT (NĐ 117/2025) đều không có trường này, chỉ cần định danh (MST/tên) + doanh thu + số thuế; MST hộ kinh doanh = CCCD chủ hộ từ 1/7/2025 nên CCCD đã đủ. Chỉ giữ 1 ô tự nguyện "MST khác CCCD" cho trường hợp hiếm (mã cũ chưa migrate) (xem mục D/E) | UI đề xuất xong (mock, đã đơn giản hoá) — tab "Hồ sơ thuế gia sư" |
| B2 | Cấu hình thuế suất & ngưỡng | TNCN 2%, GTGT 0% (miễn — cố định theo luật, không cho chỉnh), ngưỡng miễn thuế hiện hành 1 tỷ đồng/năm, lịch sử thay đổi | UI đề xuất xong (mock) — tab "Cấu hình thuế suất" |
| B3 | Theo dõi doanh thu chịu thuế | Doanh thu lũy kế theo gia sư/năm — mục đích thông tin (giúp gia sư biết mức có thể hoàn thuế cuối năm), **không phải để xét miễn khấu trừ trước** | UI đề xuất xong (mock) — tab "Tổng quan" |
| B4 | Khấu trừ thuế tự động | Lịch sử khấu trừ theo từng booking, breakdown Gross → Phí nền tảng → TNCN 2% → Net. Áp dụng **trên mọi giao dịch, không xét ngưỡng trước** (xem mục D) | UI đề xuất xong (mock) — tab "Khấu trừ & kê khai"; BE cần chèn vào `SettlementService` |
| B5 | Kê khai & nộp thuế thay | Gộp theo kỳ, tạo lô kê khai, xuất file, trạng thái đã/chưa nộp | UI đề xuất xong (mock) |
| B6 | Chứng từ khấu trừ thuế TNCN | Sinh chứng từ theo kỳ/giao dịch — gia sư dùng để tự làm thủ tục **hoàn thuế** với cơ quan thuế nếu dưới ngưỡng | Cần xây (chưa có trong bản mock) |
| B7 | Hóa đơn điện tử | **Không bắt buộc cho phần GTGT** vì dạy học miễn thuế GTGT (không phát sinh nghĩa vụ xuất hóa đơn GTGT thay gia sư). Vẫn cần xác nhận có cần hóa đơn/biên lai dịch vụ thông thường (không phải hóa đơn GTGT) | Hạ ưu tiên — cần xác nhận lại phạm vi |
| B8 | Báo cáo thuế | Tổng TNCN đã khấu trừ theo kỳ/gia sư | Cần xây |
| B9 | Xử lý khiếu nại/điều chỉnh thuế | Gia sư khiếu nại mức khấu trừ, điều chỉnh hồi tố | Cần xây |

## C. Phân quyền CMS (bổ sung)

- `financial.manage` (mới, hiện chỉ có `financial.view`)
- `payout.manage` (nếu chưa tách khỏi `payout.view`)
- `tax.view`, `tax.manage` (mới)

## D. Kết luận pháp lý đã xác nhận (2026-07-28)

Nghiên cứu qua các nguồn: Luật Thuế GTGT, Nghị định 181/2025/NĐ-CP, Thông tư 40/2021/TT-BTC (Phụ lục I), Nghị định 117/2025/NĐ-CP, Nghị định 141/2026/NĐ-CP, và tiền lệ thực tế Grab/Be.

1. **Dạy học/gia sư miễn thuế GTGT** — khoản 13 Điều 5 Luật thuế GTGT ("dạy học, dạy nghề theo quy định của pháp luật về giáo dục, giáo dục nghề nghiệp"), làm rõ tại khoản 7 Điều 4 Nghị định 181/2025/NĐ-CP. Phụ lục I Thông tư 40/2021/TT-BTC dòng "Giáo dục và đào tạo": **GTGT 0%, TNCN 2%**. → Chỉ khấu trừ TNCN, không khấu trừ GTGT. Đã sửa toàn bộ mock/UI theo đúng con số này (trước đó nhầm giả định GTGT 5%).
2. **Ngưỡng miễn thuế thay đổi nhiều lần trong 2026**: 100 triệu (trước 2026) → 200 triệu (từ 1/1/2026) → 500 triệu → **1 tỷ đồng/năm** (từ 29/4/2026, Nghị định 141/2026/NĐ-CP sửa Nghị định 68/2026/NĐ-CP). Đây là tham số biến động rất nhanh — bắt buộc để dạng cấu hình, không hardcode.
3. **Tutora bắt buộc phải khấu trừ, không có lựa chọn "chỉ hỗ trợ tính toán rồi để gia sư tự khai".** Nghị định 91/2022/NĐ-CP (cụ thể hóa bởi 117/2025/NĐ-CP) phân định: tổ chức quản lý nền tảng số **có chức năng thanh toán** thuộc đối tượng bắt buộc khấu trừ-nộp thay; chỉ nền tảng **không có chức năng thanh toán** mới được để người bán tự khai (nền tảng khi đó chỉ cung cấp thông tin cho cơ quan thuế). Tutora giữ tiền qua escrow/PayOS → chắc chắn thuộc nhóm phải khấu trừ.
4. **Cơ chế thực tế: khấu trừ trên mọi giao dịch, không xét ngưỡng trước.** Theo tiền lệ Grab/Be (đã áp dụng từ 1/7/2025 theo đúng Nghị định 117/2025, khấu trừ 1,5% TNCN trên doanh thu chia sẻ tài xế — tỷ lệ khác vì khác ngành nghề): nền tảng khấu trừ đều đặn theo mọi giao dịch bất kể tài xế/gia sư có vượt ngưỡng năm hay không; người dưới ngưỡng **tự làm thủ tục hoàn thuế** với cơ quan thuế sau, dùng chứng từ khấu trừ do nền tảng cấp (B6). → Kiến trúc B1/B3 đã đơn giản hóa: bỏ hẳn cơ chế "duyệt miễn trừ trước khi khấu trừ" (không có căn cứ pháp lý rõ ràng cho nền tảng tự quyết miễn), hồ sơ thuế (B1) chỉ còn mục đích thu thập MST/CCCD để in đúng trên chứng từ.
5. **Bỏ hẳn trường "loại hình" (cá nhân/hộ kinh doanh) khỏi hồ sơ thuế gia sư.** Đọc trực tiếp nội dung 2 mẫu biểu: Mẫu 01-1/BK-CNKD (TT40/2021, cơ chế khai thay chung) chỉ có 7 cột — STT, Họ tên (gộp chung "hộ kinh doanh, cá nhân kinh doanh"), MST, Doanh thu, Thuế GTGT, Thuế TNCN, Tổng thuế; Mẫu 01-1/BK-CNKD-TMĐT (mẫu riêng theo NĐ 117/2025 dành cho sàn TMĐT) có cấu trúc cột tương tự (doanh thu, GTGT đã khấu trừ, TNCN đã khấu trừ) — **cả 2 nguồn độc lập đều không có trường phân loại loại hình**. Kết hợp với việc MST hộ kinh doanh = CCCD chủ hộ từ 1/7/2025, và tỷ lệ khấu trừ không phụ thuộc loại hình pháp lý người bán (chỉ phụ thuộc ngành nghề) → CCCD đã xác minh sẵn (bắt buộc để duyệt hồ sơ gia sư) là đủ để xuất chứng từ, không cần thu thập/duyệt loại hình hay giấy tờ minh chứng nào thêm. Chỉ giữ 1 ô tự nguyện "MST khác CCCD" cho ca hiếm (MST cấp trước cải cách, chưa migrate).
6. Còn cần xác nhận thêm: mẫu chứng từ khấu trừ TNCN chuẩn (B6), có cần biên lai/hóa đơn dịch vụ thông thường ngoài chứng từ khấu trừ hay không (B7 — không phải hóa đơn GTGT vì đã miễn), kỳ kê khai thực tế là tháng hay quý.

*(Vẫn cần xác nhận lại với kế toán/luật sư thuế trước khi build BE thật — đây là lĩnh vực đang thay đổi nhanh, ngưỡng miễn thuế đã đổi 3 lần chỉ trong nửa đầu 2026.)*

## E. Rà soát kiến trúc BE/DB thật (2026-07-28)

Đọc trực tiếp `SettlementService.cs`, `TutorFinanceService.cs`, `ParentService.cs`, `DisputeService.cs`, `TransactionType.cs`, dump schema Postgres. Phát hiện theo mức độ ưu tiên khi build B4/B5/B6 thật:

### E1. Ba điểm phát sinh thu nhập, không phải một

`EscrowRelease` được ghi ở 3 nơi độc lập trong `SettlementService.cs`: hoàn tất bình thường (dòng 247), hoàn tiền một phần — tutor vẫn nhận phần còn lại (dòng 323), và `FinalizeBookingEarlyAsync` khi phụ huynh ngừng thanh toán (dòng 526). Chèn thuế vào 1 chỗ sẽ để lọt 2 luồng còn lại.

**→ Không chèn rải rác.** Tạo một hàm duy nhất `CreditTutorEarningAsync(wallet, grossAmount, reference)` — là nơi *duy nhất* được phép ghi `EscrowRelease` + tính thuế + cộng `Balance`. Refactor cả 3 điểm gọi trong `SettlementService` vào hàm này.

### E2. Cơ sở tính thuế = doanh thu gộp, KHÔNG trừ phí sàn trước

Đã xác nhận qua Điểm d Khoản 2 Điều 5 Nghị định 117/2025/NĐ-CP + Thông tư 40/2021 Điều 10: doanh thu tính thuế là **toàn bộ số tiền người mua trả cho dịch vụ**, không được trừ phí sàn/hoa hồng trước khi tính. Đây là quy định rõ ràng (phương pháp khoán theo tỷ lệ % đã ấn định thấp thay cho việc trừ chi phí).

`Booking.Tutorfee` hiện tại đã là số **sau khi trừ 5% phí sàn**. TNCN phải tính trên `baseAmount` (giá dịch vụ trước phí sàn), không phải trên `Tutorfee`. Bản mock trước đó tính nhầm trên `Tutorfee` — đã sửa lại trong `taxMockData.ts` (waterfall đổi thứ tự: Gross → TNCN 2% trên gross → Phí nền tảng → Net).

### E3. Kỳ kê khai xác định theo ngày `EscrowRelease`, không theo ngày booking

Một khóa 20 buổi có thể kéo dài nhiều tháng, thanh toán trước — nhận tiền sau. Điểm mốc xác định kỳ phải là **ngày ghi nhận `EscrowRelease`** (có dấu vết trong ledger, kiểm toán được), không phải ngày booking bắt đầu/kết thúc dự kiến.

### E4. Ghi 2 dòng ledger, không ghi 1 dòng net

Cần thêm `TransactionType.TaxWithholding` vào `MV.DomainLayer/Constants/TransactionType.cs`. Khi khấu trừ, ghi **2 bút toán**: `EscrowRelease = +gross` (giữ nguyên ý nghĩa "thu nhập", để `TotalEarned` trong `TutorFinanceService.cs` không bị sai lệch) và `TaxWithholding = -tax`; `Balance` tăng đúng `gross − tax`. Nếu chỉ ghi 1 dòng net thì mất dấu vết thuế trong sổ cái → không xuất được chứng từ khấu trừ, không đối soát được với tờ khai đã nộp.

Cần đồng bộ ở FE: `formatTransactionType()` trong `utils/formatters.ts` và `TRANSACTION_TYPE_OPTIONS` trong `TransactionLedger.tsx` thêm loại `TaxWithholding`.

### E5. Làm tròn: theo đồng, không theo kỳ chia lẻ

VND không có phần thập phân nhưng DB `numeric(15,2)` và code dùng `Math.Round(x, 2)` khắp nơi. Vì thuế tính 1 lần trên tổng booking khi release (không chia theo buổi, theo E3) nên hầu như không phát sinh sai số chia — chỉ 2 luồng ngoại lệ có chia nhỏ (hoàn tiền một phần, kết thúc sớm). Quy tắc:
- Làm tròn đến đồng: `Math.Round(x, 0, MidpointRounding.AwayFromZero)`.
- Số kê khai kỳ = `round(Σ doanh thu chịu thuế trong kỳ × tỷ lệ)`, không phải tổng cộng dồn các số thuế lẻ đã làm tròn từng giao dịch — nếu lệch vài đồng, gán chênh lệch vào giao dịch cuối kỳ.
- Ghi quy tắc làm tròn vào bảng cấu hình thuế (cùng chỗ thuế suất/ngưỡng) để có căn cứ khi kiểm toán.

### E6. Chống ghi trùng (idempotency)

`wallet_transactions` không có unique constraint nào trong schema hiện tại. Tiền ghi trùng còn phát hiện qua đối chiếu số dư; **thuế ghi trùng nghĩa là tờ khai sai và đã nộp cho cơ quan thuế** — hậu quả nặng hơn. Cần unique index trên `(reference_table, reference_id, transaction_type)`, hoặc idempotency key riêng cho bản ghi thuế.

### E7. Định danh: CCCD đã bắt buộc sẵn — không cần thu thập "loại hình", chỉ cần MST tự nguyện

Đã xác nhận: CCCD (`hasIdentity`) là 1 trong 5 mục bắt buộc để gia sư được duyệt hồ sơ (`TutorService.cs`), OCR qua `EkycService`, lưu `users.identity_number` (đã **mã hoá**). Không cần thêm ràng buộc CCCD mới, và **không cần thu thập/duyệt "loại hình" (cá nhân/hộ kinh doanh)** — đã xác nhận qua nội dung Mẫu 01-1/BK-CNKD và 01-1/BK-CNKD-TMĐT (mục D.5): trường này không xuất hiện trên bảng kê nộp cơ quan thuế, và MST hộ kinh doanh = CCCD chủ hộ từ 1/7/2025 nên CCCD đã đủ để xuất chứng từ.

Việc cần làm: (a) thêm trường MST **tự nguyện** (không bắt buộc, không duyệt) cho ca hiếm gia sư có MST khác CCCD (mã cấp trước cải cách, chưa migrate); (b) scope quyền giải mã CCCD riêng cho module thuế — không nên để permission `tax.view` đọc được CCCD thô của toàn bộ gia sư khi chỉ cần xuất chứng từ.

### E8. Bản ghi thuế bất biến — không cần workflow "điều chỉnh giảm kỳ trước"

Ban đầu lo ngại: hoàn tiền sau khi đã khấu trừ + đã nộp thuế. **Đã xác nhận KHÔNG xảy ra trong luồng nghiệp vụ bình thường**: `ParentService.cs` chặn tạo dispute mới nếu `classSession.Issettled == true` (có comment rõ ý đồ thiết kế), `SettlementService.ProcessRefundAsync` và luồng no-show cũng có cùng guard. `ProcessRefundAsync`/`SettleDisputedClassSessionAsync` chỉ được gọi từ `DisputeService` (dispute chỉ mở được *trước* khi settle) — không có đường vòng nào refund một buổi đã `Issettled`. PayOS (chuyển khoản/VietQR nội địa) cũng không có cơ chế chargeback kiểu thẻ quốc tế.

Rủi ro còn lại chỉ là tail-risk ngoài luồng nghiệp vụ (admin sửa lỗi hệ thống thủ công). **Không cần xây UI "điều chỉnh giảm kỳ trước".** Chỉ cần: bảng `TaxWithholdingRecord` là **immutable** (không update/xoá) — nếu cần đảo ngược thì tạo bản ghi bù trừ mới, giữ dấu vết kiểm toán.

### Checklist tổng hợp khi build BE/DB thật

| # | Việc cần làm | Vị trí |
|---|---|---|
| 1 | Tạo `CreditTutorEarningAsync` — điểm ghi `EscrowRelease` + tính thuế duy nhất, refactor 3 nơi gọi | `SettlementService.cs` (dòng 247, 323, 526) |
| 2 | Tính TNCN trên doanh thu gộp (`baseAmount`), không trừ phí sàn trước | Trong hàm ở mục 1 |
| 3 | Kỳ kê khai = ngày ghi nhận `EscrowRelease` | Trong hàm ở mục 1 |
| 4 | Thêm `TransactionType.TaxWithholding`, ghi 2 dòng ledger (gross + trừ thuế riêng) | `TransactionType.cs`, FE `formatters.ts`, `TransactionLedger.tsx` |
| 5 | Làm tròn theo đồng; số kê khai kỳ tính từ tổng kỳ, không cộng dồn số lẻ | Bảng cấu hình thuế |
| 6 | Unique index/idempotency chống ghi trùng | `wallet_transactions` |
| 7 | Thêm trường MST optional; scope quyền giải mã CCCD riêng cho module thuế | `users`/bảng `tutor_tax_profile` mới |
| 8 | `TaxWithholdingRecord` immutable — không update/xoá, chỉ bù trừ bằng bản ghi mới | Thiết kế bảng mới |
| 9 | Chặn release nếu gia sư chưa xác minh CCCD/MST (điều kiện rút tiền hiện tại chỉ check bank account) | `TutorFinanceService.cs` dòng ~318 |

*(Đã sửa `taxMockData.ts`/`TaxWithholdingTab.tsx` theo đúng E2 — TNCN tính trên doanh thu gộp. Các số liệu tổng hợp cấp kỳ/tháng trong mock vẫn là minh hoạ, không bắt buộc khớp tuyệt đối theo từng giao dịch.)*
