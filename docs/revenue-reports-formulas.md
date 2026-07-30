# Báo cáo doanh thu — Từ điển công thức

> Tài liệu tra cứu cho trang `/admin-portal/revenue-reports` (6 tab).
> Mục đích: khi hội đồng, kiểm toán hoặc mentor hỏi **"con số này tính thế nào"**,
> mở đúng mục và đọc được công thức cùng vị trí code.
>
> Mọi công thức dưới đây trích từ code thật, không phải mô tả mong muốn.
> Nguồn chính: `Tutora-Backend/MV.ApplicationLayer/Services/AdminRevenueAnalyticsService.cs`
>
> Tài liệu liên quan: [`finance-reporting-spec.md`](./finance-reporting-spec.md) —
> bàn về *nên* báo cáo gì. File này mô tả hệ thống *đang* tính gì.

---

## 0. Cảnh báo đọc số

Ba điều phải nói trước, vì đọc sai ba điều này là hiểu sai toàn bộ báo cáo:

1. **Chưa trừ chi phí.** Không con số nào trong báo cáo là lợi nhuận. Chi phí AI (trả
   Google), phí cổng thanh toán PayOS, chi phí marketing đều **quản lý ngoài hệ thống**
   theo quyết định vận hành. "Doanh thu nền tảng" = hoa hồng thu được, chưa trừ gì.

2. **Ba tầng số liệu không được cộng/trừ lẫn nhau.** GMV, doanh thu ghi nhận, tiền mặt
   tính trên ba tập booking khác nhau (§2). Trừ hai số khác tầng cho nhau là sai.

3. **Hoàn tiền chưa được trừ khỏi doanh thu.** Hiển thị riêng ở tab Ghi nhận doanh thu
   (§8). Doanh thu ròng = doanh thu ghi nhận − hoàn tiền, phải tự trừ khi báo cáo.

---

## 1. Thuật ngữ

| Thuật ngữ | Nghĩa | Vì sao quan trọng |
|---|---|---|
| **GMV** | Tổng tiền khách trả, gồm cả phần thuộc về gia sư | Đo quy mô sàn, **không phải** doanh thu Tutora |
| **Doanh thu nền tảng** | Phần hoa hồng Tutora giữ lại | Tiền thật của công ty |
| **Ghi nhận sớm** (contracted) | Toàn bộ hoa hồng tính ngay khi ký booking | Cách hệ thống đang ghi — thổi phồng doanh thu |
| **Thực hiện** (recognised) | Hoa hồng của buổi **đã dạy xong** | Đúng chuẩn kế toán |
| **Nợ dịch vụ** (deferred) | Hoa hồng của buổi đã bán **chưa dạy** | Nghĩa vụ còn nợ khách |
| **Escrow** | Tiền giữ hộ, chờ giải ngân cho gia sư | **Nợ phải trả**, không phải tiền Tutora |
| **Settle** | Buổi học đã xác nhận hoàn tất (`is_settled = true`) | Mốc ghi nhận doanh thu |
| **Take rate** | Hoa hồng ÷ GMV | Sàn giữ lại bao nhiêu trên mỗi đồng |
| **LTV** | Chi tiêu bình quân trọn đời một khách | Vô nghĩa nếu không có CAC (quản lý ngoài) |
| **ARPU** | Doanh thu bình quân mỗi khách hoạt động | Đo cường độ chi tiêu |
| **Cohort** | Nhóm khách bắt đầu cùng một tháng | Đo giữ chân theo thời gian |

---

## 2. Nền tảng: công thức phí

Nguồn: `MV.ApplicationLayer/Helpers/BookingFeeCalculator.cs`

Take rate **10% đối xứng** — thu 5% từ mỗi bên:

```
baseAmount      = giá gia sư niêm yết
parentFee       = baseAmount × 5%        → phụ huynh trả THÊM
tutorFeeCut     = baseAmount × 5%        → cắt TỪ tiền gia sư

platformFee     = parentFee + tutorFeeCut     = baseAmount × 10%   ← doanh thu Tutora
finalPrice      = baseAmount + parentFee                            ← GMV, khách trả
tutorReceivable = baseAmount − tutorFeeCut                          ← gia sư nhận
```

Chia 2 đợt (`CalculatePaymentPhases`):

```
deposit   = floor(finalPrice / totalSessions)   // đúng giá 1 buổi
remaining = finalPrice − deposit
// booking 1 buổi: deposit = finalPrice, remaining = 0
```

**Đơn giá hoa hồng mỗi buổi** — dùng ở hầu hết mọi công thức:

```
FeePerSession(b) = round(b.PlatformFee / b.TotalSessions, 2)
```

### Tập booking tính doanh thu

`RevenueBookingStatuses` = `Paid`, `DepositPaid`, `PendingRemainingPayment`,
`Ongoing`, `Completed`. Booking huỷ / quá hạn thanh toán **rơi khỏi mọi thống kê
doanh thu** — đây là lý do phải xem hoàn tiền riêng (§8).

---

## 3. Ba tầng số liệu — tính trên ba tập khác nhau

Đây là chỗ dễ sai nhất khi đối chiếu.

```
Ghi nhận sớm (Contracted)  = Σ PlatformFee của booking TẠO trong kỳ
Thực hiện    (Recognised)  = Σ FeePerSession của buổi ĐÃ SETTLE trong kỳ
Nợ dịch vụ   (Deferred)    = Σ FeePerSession × (TotalSessions − đã settle)
                             của MỌI booking dang dở tính tới cuối kỳ
```

> **Deferred ≠ Contracted − Recognised.**
> Contracted lọc theo *ngày tạo booking*; Recognised lọc theo *ngày dạy* (booking có thể
> tạo từ kỳ trước); Deferred là số **luỹ kế toàn lịch sử**, không giới hạn kỳ.
> Ba tập booking khác nhau nên không trừ được cho nhau.

Code: `RecognisedIn()`, `ContractedIn()`, `ComputeDeferred()`.

**Độ lệch ghi nhận sớm** = `Contracted − Recognised` (chặn dưới ở 0). Càng lớn thì
doanh thu đang bị ghi nhận trước khi dịch vụ được cung cấp càng nhiều.

---

## 4. Khoảng thời gian

Nguồn: `tutora-cms/src/hooks/useRevenueReport.ts`

Hai nhóm khác bản chất:

| Nhóm | Preset | Cách tính |
|---|---|---|
| **Trượt** | 3 tháng, 6 tháng, 12 tháng | Lùi từ *hôm nay* — xem xu hướng gần đây |
| **Kỳ kế toán** | Quý này, Quý trước, Từ đầu năm, Năm trước | Mốc dương lịch cố định — đối chiếu sổ sách |

Kỳ kế toán chốt cả hai đầu vào mốc dương lịch, không phụ thuộc ngày chạy báo cáo —
đây là nhóm dùng khi làm việc với hội đồng và kiểm toán.

**Kỳ so sánh** (`PreviousPeriod`): lùi lại đúng bằng độ dài kỳ hiện tại.

```
span     = to − from
prevFrom = from − span
prevTo   = from
```

**Cột biểu đồ** (`MonthBuckets`): mọi biểu đồ theo tháng sinh mốc **từ chính khoảng đang
xem**, không cố định 6/12 cột. Chọn 3 tháng → 3 cột, khớp đúng với thẻ số liệu ở trên.

---

## 5. Tab Tổng quan

| Chỉ số | Công thức |
|---|---|
| GMV | Σ `FinalPrice` của booking tạo trong kỳ |
| Doanh thu thực hiện | `RecognisedIn(kỳ)` + doanh thu AI trong kỳ |
| Ghi nhận sớm | `ContractedIn(kỳ)` + doanh thu AI trong kỳ |
| Nợ dịch vụ | `ComputeDeferred(tính tới cuối kỳ)` |
| Tiền mặt đã thu | Σ giao dịch `Succeeded` có `PaidAt` trong kỳ |

Phễu booking: đếm booking theo bậc trạng thái (`StatusRank`), booking huỷ / quá hạn
rơi khỏi phễu.

---

## 6. Tab Gia sư

| Chỉ số | Công thức |
|---|---|
| GMV | Σ `FinalPrice` booking của gia sư, tạo trong kỳ |
| Doanh thu nền tảng | Σ `FeePerSession` của buổi đã settle trong kỳ |
| Gia sư nhận | Σ `round(TutorFee / TotalSessions, 2)` của buổi đã settle |
| **Tỷ lệ ăn chia** | `Doanh thu nền tảng / GMV × 100` |
| Tỷ lệ huỷ | `huỷ / (đã dạy + huỷ) × 100` |
| DT/buổi | `Doanh thu nền tảng / số buổi đã dạy` |

> **Tỷ lệ ăn chia chỉ so sánh tương đối giữa các gia sư**, không phải take rate kế toán:
> tử số tính theo *buổi đã dạy* còn mẫu số theo *booking tạo trong kỳ* — hai mốc thời
> gian khác nhau.

**Escrow — không lọc theo kỳ.** Đây là **số dư ví tại thời điểm hiện tại**, mang ý nghĩa
nợ phải trả trên bảng cân đối, nên đổi khoảng thời gian **không** làm đổi con số.

```
TotalEscrowHeld = Σ frozen_balance của mọi ví gia sư có hồ sơ hiện hữu
```

Nghiệp vụ không cho xoá gia sư khi ví còn tiền. Nếu vẫn xảy ra (sửa tay dưới DB), hệ
thống ghi `LogWarning "Escrow mồ côi"` kèm UserId thay vì bỏ qua im lặng.

**Hai cách đếm gia sư** — đừng dùng `tutors.length` (đã cắt còn `top` dòng):

- `TutorsWithRevenue` — đã dạy xong ≥1 buổi trong kỳ
- `ActiveTutors` — có buổi trong kỳ, kể cả huỷ hết

**Mức độ tập trung**: Top 10 / Gia sư 11–50 / Còn lại. Top 10 vượt 50% là rủi ro phụ
thuộc nhóm nhỏ.

---

## 7. Tab Khách hàng

### Khoá định danh khách hàng

```
CustomerKey(b) = b.ParentId ?? b.StudentId
```

Học sinh **tự đặt lịch** không có phụ huynh liên kết nên `ParentId = null`
(xem `BookingService.cs:127`). Mọi thống kê phải gom theo khoá này, nếu chỉ lọc
`ParentId != null` sẽ **mất trắng nhóm học sinh tự do** khỏi báo cáo.

### Tra tên khách hàng

Thứ tự bắt buộc: **`users` trước, `student_profiles` sau**.

Học sinh tự đăng ký tài khoản thì `booking.student_id` trỏ thẳng vào `users` và
**không có** dòng trong `student_profiles` (hồ sơ chỉ sinh khi phụ huynh tạo cho con).
Tra ngược thứ tự sẽ trượt và in ra UUID giữa báo cáo.

### Công thức

| Chỉ số | Công thức |
|---|---|
| Khách hoạt động | Số `CustomerKey` khác nhau có booking trong kỳ |
| Giá trị booking TB | `Σ FinalPrice / số booking` trong kỳ |
| **Tỷ lệ tái mua** | % khách có **≥2 booking**, toàn lịch sử, **không** phân biệt thời điểm |
| LTV | `Σ FinalPrice toàn lịch sử / số khách` |
| ARPU tháng | `RecognisedIn(tháng) / số khách hoạt động tháng đó` |
| Nợ dịch vụ | `Σ FeePerSession × (TotalSessions − đã settle)` |

### "Tái mua" ≠ "Quay lại tháng sau"

Hai chỉ số **cố ý khác nhau**, đây không phải lỗi:

| | Định nghĩa | Khách đặt 11 lần trong 1 tháng |
|---|---|---|
| Card *Tỷ lệ tái mua* | ≥2 booking, bất kể thời điểm | tính là **tái mua** |
| Chart *Quay lại tháng sau* | tháng đầu tiên nằm ở tháng **trước** | tính là **khách lần đầu** |

Chart đếm **distinct khách** (không phải booking), nên card thường cao hơn chart.

### Phân khúc

Tách theo người chi tiền: **Phụ huynh** (`ParentId != null`) vs **Học sinh tự đặt**.
Doanh thu tính trong kỳ; LTV và tỷ lệ tái mua tính trên toàn lịch sử nhóm — cùng quy
ước với thẻ tổng. Dùng để quyết định nhắm marketing vào nhóm nào.

---

## 8. Tab Ghi nhận doanh thu

### Tuổi nợ dịch vụ

Chia 0–30 / 31–60 / 61–90 / >90 ngày, tính từ **ngày tạo booking** tới cuối kỳ.
Chạy trên **toàn bộ** booking dang dở, **không lọc theo kỳ** — là số dư luỹ kế.

### Booking chết sau đợt 1

Khách trả cọc, học **đúng một buổi**, rồi không trả tiếp.

```
Bắt buộc (loại trừ trước):
  RemainingPaidAt != null  → đã trả đủ, không phải rò rỉ đợt 2
  đã settle ≠ 1            → chưa học, hoặc đã học tiếp bằng tiền đợt 2
  TotalSessions <= 1       → khoá 1 buổi, đợt 1 là toàn bộ, không có đợt 2
  DepositPaidAt == null    → chưa từng trả cọc

Chủ động dừng HOẶC quá hạn:
1. Huỷ:               CancelledAt != null
2. Kết thúc sớm:      status ∈ {completed, cancelled_noshow}
3. Quá hạn trả đợt 2: PaymentDueAt < cuối kỳ
4. Tồn đọng:          DepositPaidAt + 14 ngày < cuối kỳ

Tiền mất  = Σ FeePerSession × (TotalSessions − đã settle)
Tỷ lệ rơi = số booking chết / số booking VƯỢT ĐƯỢC đợt 1, tạo trong kỳ × 100
```

> **Vì sao phải xét cả status `completed`:** khi khách dừng giữa chừng,
> `SettlementService.EarlyTermination.cs:135` đóng booking thành `Completed` (giải ngân
> phần đã dạy, huỷ buổi còn lại) **dù khách chưa hề trả đợt 2** — `Paymentstatus` cố ý
> giữ `DepositEscrowed`. Nếu chỉ xét `deposit_paid`/`pending_remaining_payment` thì nhóm
> rò rỉ lớn nhất của mô hình 2 đợt sẽ không bao giờ được đếm. Dấu hiệu nhận biết:
> `RemainingPaidAt == null` **và** số buổi đã dạy < số buổi đã mua.

> **Vì sao đúng một buổi, không phải "≥1 buổi":** đợt 1 mua đúng một buổi
> (`CalculatePaymentPhases`: deposit = giá 1 buổi). Học hết phần đã trả rồi không trả tiếp
> mới thể hiện **quyết định chủ động** của khách. Nếu khách đã trả đợt 2 rồi mới bỏ dở
> (buổi 2, 3…) thì tiền đã thu đủ — không phải rò rỉ đợt 2, và phần buổi chưa dạy đã nằm
> trong nợ dịch vụ + tuổi nợ.

> **Vì sao không đếm ca chưa học buổi nào:** gia sư từ chối nhận lớp, khách huỷ trước khi
> vào học, hay booking timeout đều là giao dịch đứt gánh **trước khi dịch vụ bắt đầu** —
> khách được hoàn tiền và đã phản ánh ở thẻ Hoàn tiền. Đếm vào đây là quy sai trách nhiệm
> cho phía khách và thổi phồng tỷ lệ rơi.

> **Mẫu số đếm theo status, không theo `DepositPaidAt`:** mốc đó có thể đã được gán rồi
> booking vẫn hỏng (timeout, huỷ trước khi vào lớp), nên đếm theo mốc sẽ ra nhiều hơn số
> booking thật sự qua được đợt 1. Mẫu số dùng
> `HasPassedDeposit()` = status ∈ {deposit_paid, pending_remaining_payment, paid, ongoing, completed}.

### Trả tiền nhưng chưa học

Chỉ số **riêng biệt**, không gộp với ở trên vì nguyên nhân khác hẳn.

```
Điều kiện: đã settle = 0
           AND RemainingPaidAt == null
           AND DepositPaidAt != null
           AND CancelledAt == null        (đã huỷ → thuộc thống kê hoàn tiền)
           AND HasPassedDeposit(b)
           AND DepositPaidAt + 14 ngày < cuối kỳ

FeeAtRisk = Σ FeePerSession × TotalSessions   (hoa hồng, chưa dạy buổi nào)
CashHeld  = Σ FinalPrice                      (tiền khách trả đang nằm im)
```

| | Học thử rồi bỏ | Trả tiền chưa học |
|---|---|---|
| Dịch vụ | đã bắt đầu | **chưa từng bắt đầu** |
| Nguyên nhân thường gặp | trải nghiệm học kém | tắc xếp lịch, gia sư không nhận dạy |
| Trách nhiệm | phía khách | **phía nền tảng** |

> **Không cần thêm cột đánh dấu trong DB.** Trạng thái "chỉ hoàn thành đợt 1" suy được từ
> `DepositPaidAt != null AND RemainingPaidAt == null`. Thêm marker mới sẽ tạo trạng thái
> trùng lặp phải đồng bộ tay ở nhiều nơi trong luồng thanh toán.

> **Vì sao không chỉ dùng `PaymentDueAt`:** trường này dùng chung cho cả hai đợt và bị
> xoá về `null` khi trả cọc xong (`PaymentService.cs:745`), chỉ được gán lại (+48h) lúc
> **gia sư nộp báo cáo buổi đầu** (`ClassSessionService.M3.Attendance.cs:420`). Booking mà
> gia sư chưa báo cáo sẽ có `PaymentDueAt = null` → lọt lưới hoàn toàn. Đây là lý do phải
> neo theo `DepositPaidAt` (mốc không bị xoá).

> **Xét trên toàn bộ booking, không phải `revenueBookings`:** khách huỷ chủ động mang
> status `cancelled` — nằm ngoài `RevenueBookingStatuses`, nếu lọc trước thì tình huống 1
> không bao giờ được đếm. Mẫu số của tỷ lệ rơi cũng lấy cùng tập và chỉ gồm booking đã
> thực sự trả cọc.

Đây là nguồn rò rỉ lớn nhất của mô hình trả 2 đợt: khách trả 1 buổi, học thử rồi dừng,
nhưng hệ thống vẫn ghi nhận đủ 100% phí.

### Hoàn tiền

Nguồn: `wallet_transactions` với `transaction_type = 'Refund'`.

> **Không** dùng `Booking.Refundamount` — trường đó chỉ giữ số luỹ kế, **không có mốc
> thời gian** nên không quy được về kỳ báo cáo.

```
Hoàn tiền trong kỳ = Σ amount các giao dịch Refund có created_at trong kỳ
Tỷ lệ trên tiền mặt = hoàn tiền / tiền mặt đã thu trong kỳ × 100
```

**Doanh thu ròng phải tự trừ**: các thẻ doanh thu phía trên chưa trừ khoản này.

---

## 9. Tab Môn & Lớp

| Chỉ số | Công thức |
|---|---|
| GMV | Σ `FinalPrice` booking của môn, tạo trong kỳ |
| Doanh thu nền tảng | Σ `FeePerSession` × buổi đã settle |
| Nợ dịch vụ | Σ `FeePerSession` × (TotalSessions − đã settle) |
| Giá TB/buổi | `GMV / tổng buổi đã bán` |
| Tỷ lệ hoàn thành | `buổi đã dạy / buổi đã bán × 100` |

> **Nợ dịch vụ KHÔNG phải `GMV − Doanh thu nền tảng`.** GMV là giá khách trả (gồm cả
> phần gia sư), doanh thu chỉ là hoa hồng. Trừ hai số khác cơ sở sẽ thổi phồng nghĩa vụ
> của nền tảng lên nhiều lần.

Biểu đồ xu hướng theo môn chỉ tính buổi thuộc `revenueBookings` — cùng tập với bảng và
ma trận, nếu không tổng các cột sẽ vượt quá doanh thu ở bảng.

---

## 10. Tab Doanh thu AI

| Chỉ số | Công thức |
|---|---|
| Doanh thu AI | Σ giao dịch `AiCreditPurchase` trạng thái `Succeeded` |
| Lượt đã cấp | Σ ledger (tặng đăng ký + tặng có lịch + mua gói) |
| Lượt còn lại | `đã cấp − đã dùng` |
| Tỷ lệ kích hoạt | `số tài khoản đã hỏi ≥1 câu / tổng tài khoản được cấp × 100` |
| Tỷ lệ sử dụng | `lượt đã dùng / lượt đã cấp` **của riêng nhóm đã kích hoạt** |

Hai tỷ lệ trên có mẫu số khác nhau **có chủ đích**: mọi tài khoản đều được tặng lượt khi
đăng ký, nên nếu tính tỷ lệ sử dụng trên toàn bộ sẽ bị hàng trăm tài khoản chưa bao giờ
mở tính năng kéo xuống.

> **`Lượt còn lại` là nợ chi phí tương lai**: mỗi lượt khi dùng sẽ phát sinh tiền trả
> API. Chi phí này quản lý ngoài hệ thống, báo cáo không quy ra tiền.

---

## 11. Những chỗ báo cáo **chưa** trả lời được

Ghi ra để không ai hiểu nhầm phạm vi:

1. **Lãi/lỗ** — không có dữ liệu chi phí trong hệ thống (theo quyết định vận hành).
2. **Đối chiếu số dư PayOS** — chưa có endpoint `payos-balance`; hiện không phát hiện
   được giao dịch treo hay chênh lệch cổng thanh toán.
3. **CAC / hiệu quả marketing** — quản lý ngoài, nên LTV chưa kết luận được đơn vị kinh
   tế lành mạnh hay không.
4. **Xuất Excel** — chưa có; hội đồng chưa tự đối chiếu số bằng file được.

---

## 12. Tra nhanh theo file

| Nội dung | Vị trí |
|---|---|
| Toàn bộ công thức báo cáo | `Tutora-Backend/MV.ApplicationLayer/Services/AdminRevenueAnalyticsService.cs` |
| Công thức phí gốc | `Tutora-Backend/MV.ApplicationLayer/Helpers/BookingFeeCalculator.cs` |
| Hợp đồng dữ liệu (DTO) | `Tutora-Backend/MV.DomainLayer/DTO/ResponseModel/Admin/AdminRevenueAnalyticsResponse.cs` |
| Endpoint | `Tutora-Backend/MV.PresentationLayer/Controllers/AdminRevenueAnalyticsController.cs` |
| Khoảng thời gian | `tutora-cms/src/hooks/useRevenueReport.ts` |
| Giao diện 6 tab | `tutora-cms/src/pages/AdminRevenueReports/tabs/` |
