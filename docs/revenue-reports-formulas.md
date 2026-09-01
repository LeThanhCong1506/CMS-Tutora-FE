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

3. **Hoàn tiền ĐÃ được trừ khỏi doanh thu — đừng trừ lần nữa.** Với khoá bị huỷ giữa
   chừng, doanh thu ghi nhận lấy thẳng số Tutora **thực giữ** theo sổ ví, tức đã trừ sẵn
   khoản hoàn cho phụ huynh (§2.1). Thẻ "Đã hoàn tiền" ở tab Doanh thu là **học phí gộp**
   trả lại khách, không phải hoa hồng — trừ nó vào doanh thu là trừ hai lần, và sai cả
   đơn vị.

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

**Hai vế của phí sàn, hai mốc chín khác nhau** — nền của hầu hết mọi công thức:

```
ParentFeePerSession(b) = round(b.ParentFee / b.TotalSessions, 2)
TutorCutPerSession(b)  = round((b.PlatformFee - b.ParentFee) / b.TotalSessions, 2)

firstDelivered           = ngày buổi ĐẦU TIÊN được settle (null nếu chưa buổi nào)
sliceMaturesAt(paidAt)   = paidAt == null || firstDelivered == null ? null
                         : max(paidAt, firstDelivered)

ParentFeeEarned(b, asOf) = (sliceMaturesAt(DepositPaidAt)   <= asOf ? lat coc         : 0)
                         + (sliceMaturesAt(RemainingPaidAt) <= asOf ? ParentFee - lat coc : 0)
EarnedSoFar(b, asOf, n)  = ParentFeeEarned(b, asOf) + TutorCutPerSession(b) x min(n, TotalSessions)
UnearnedSoFar(b, ...)    = max(0, PlatformFee - EarnedSoFar(...))
```

Tiền của một khoá nằm trong **escrow**, không phải trong túi Tutora, nên 10% phí sàn không
chín cùng lúc — nó gồm hai khoản mà rủi ro hoàn tiền khác hẳn nhau:

| Vế | Chín khi nào | Vì sao |
|---|---|---|
| **Phí phụ huynh** (5%, `Parentfee`) | khi **buổi ĐẦU TIÊN đã dạy xong** — không phải lúc thanh toán | trước buổi đầu, phụ huynh huỷ được và nhận lại **100% kể cả phí**: `BookingService.CancelBooking` hoàn trọn `Depositamount`, và `HasStartedOrSettledLesson` chặn đúng luồng đó lại ngay khi có một buổi settle. Sau mốc ấy huỷ giữa chừng chỉ hoàn **giá gốc** (`ParentRefundPerSessionNoFee`) |
| **Phí gia sư** (5%, cắt từ `Tutorfee`) | khi buổi học **dạy xong và settle** | buổi chưa dạy thì escrow bị **đảo**, gia sư không nhận nên Tutora không có gì để cắt |

Nên mốc ghi nhận một lát phí phụ huynh = **muộn hơn** giữa (ngày trả đợt đó, ngày buổi đầu dạy
xong). Trước đó nó là doanh thu **tạm tính**, không phải tiền thật.

> **Công thức cũ `FeePerSession = PlatformFee / TotalSessions` đã bỏ.** Nó gộp cả hai vế vào
> ngày dạy. Bản trung gian (01/09) thì cho phí phụ huynh chín ngay lúc thanh toán — cũng sai,
> vì khoản đó còn hoàn lại được 100% cho tới khi buổi đầu diễn ra. Tổng hai vế vẫn đúng bằng
> `PlatformFee` khi khoá chạy trọn vẹn.

Ngoại lệ duy nhất: khoá **đã chốt sổ** không dùng công thức này mà đọc thẳng sổ ví (§2.1).

### 2.0 Hai NGUỒN doanh thu — mỗi tab báo nguồn của mình

Chốt 01/09/2026: phí sàn 10% không còn được hiển thị gộp ở mọi trang. Nó có **hai nguồn**, và
mỗi nguồn có trang riêng để trả lời đúng câu hỏi của trang đó:

| Nguồn | Ai trả | Trang báo | Chỉ tiêu |
|---|---|---|---|
| **Phí gia sư** — 5% cắt từ `Tutorfee` | gia sư | `/revenue-reports/tutors` | `TutorFeeRevenue` |
| **Phí dịch vụ** — 5% `Parentfee` phụ huynh trả thêm | khách hàng | `/revenue-reports/customers` | `ServiceFeeRecognised` + `ServiceFeePending` |

```
TutorFeeRevenue      = TutorCutPerSession x buổi settle trong kỳ  +  TutorCutAdjustment
ServiceFeeRecognised = ParentFeeEarned(b, toUtc)   |  khoá đã chốt: ParentFeeKept
ServiceFeePending    = ParentFee - ParentFeeEarned |  khoá đã chốt: 0

TutorFeeRevenue + ServiceFeeRecognised == RecognisedRevenue (tab Doanh thu, chưa kể gói AI)
```

> **Tổng tab Gia sư CỐ Ý nhỏ hơn tab Doanh thu.** Trước đây gộp cả hai nguồn rồi treo dưới tên
> một gia sư — tức nói người đó mang về cho sàn cả khoản mà PHỤ HUYNH trả. Nay mỗi trang chỉ
> báo nguồn của mình; muốn con số 10% thì cộng hai trang, hoặc đọc tab Doanh thu.

**Phần chênh khi chốt sổ chia thế nào.** `Adjustment` (§2.1) là phần sổ ví nói khác công thức —
hoàn tiền một phần theo khiếu nại, hoặc dữ liệu sửa tay. Nó không mang sẵn thông tin "của bên
nào", nên chia theo **tỉ lệ hai vế đã chín**; vế thứ hai lấy bằng hiệu để hai mảnh luôn cộng
đúng bằng `Adjustment`. Khi chưa vế nào chín mà ví vẫn báo giữ được tiền thì dồn hết về vế
**phí dịch vụ** — đó là tiền của phụ huynh không được hoàn, không liên quan tới công gia sư.

Đối chiếu thật (dev, kỳ 02/08–01/09): phí gia sư `217.361` + phí dịch vụ đã ghi nhận `282.639`
= `500.000`, đúng bằng "Doanh thu đã ghi nhận" của tab Doanh thu.

### Tập booking tính doanh thu

Hai nhóm, tính bằng hai cách khác nhau:

| Nhóm | Điều kiện | Tiền tính bằng |
|---|---|---|
| **Chưa chốt sổ** | status ∈ `RevenueBookingStatuses` **VÀ** `escrow_status = holding` | công thức hai vế (`EarnedSoFar`) |
| **Đã chốt sổ** | status ngoài danh sách trên, **HOẶC** `escrow_status ∈ {released, refunded}` | **sổ ví** (§2.1) |

> **Phải xét cả `escrow_status`, không chỉ status.** Có hai luồng đóng khoá giữa chừng mà
> vẫn để status `completed`: gia sư bị đình chỉ (`SuspensionRefundService`) và khách bỏ dở
> sau đợt 1 (`SettlementService.FinalizeBookingEarlyByUserAsync`). Nếu chỉ xét status thì
> cả nhóm này bị tính bằng công thức hợp đồng và **hụt** đúng phần phí dịch vụ không hoàn.
>
> Escrow chỉ mở khi cả khoá kết thúc, nên khoá đang chạy không bao giờ lọt vào nhóm "đã
> chốt sổ" kể cả khi đã có buổi settle — đó là điều kiện để tin được số liệu ví.

Hợp của hai nhóm gọi là **cohort**, dùng cho GMV và khối chia tiền.

**Hai nhóm nằm NGOÀI cohort, cùng một lý do — không phải giao dịch:**

1. huỷ khi **chưa ai trả đồng nào** (gia sư không nhận, quá hạn thanh toán) → `CashIn = 0`;
2. **đã trả rồi được hoàn 100%** (huỷ trước buổi đầu, gia sư không phản hồi, no-show) →
   `CashIn − Refunded ≤ 0`. Phụ huynh lấy lại từng đồng nên về mặt kinh tế giống hệt nhóm 1.

> **Điều kiện là `CashIn − Refunded > 0`, không phải `CashIn > 0`.** Bản trước chỉ chặn nhóm 1;
> nhóm 2 lọt vào cohort theo GIÁ HỢP ĐỒNG, nên một khoá phụ huynh trả 157.500đ rồi lấy về hết
> vẫn cộng 1.417.500đ vào "Tiền phụ huynh trả" và 135.000đ vào "Doanh thu tạm tính" — rồi lập
> tức bị trừ lại ở lát "Không thu được". Ba con số đầu trang cùng phồng lên vì một giao dịch
> không tồn tại. Đo trên dữ liệu dev 01/09/2026: 8 khoá như thế thổi GMV lên **17,9%** (21,4tr →
> 17,6tr), thổi tạm tính lên **17,9%** (2.037.500 → 1.672.500) và chiếm
> **63%** lát "Không thu được".

Khoá hoàn **một phần** thì ở lại: phụ huynh vẫn mất tiền thật, sàn vẫn giữ phần phí không hoàn —
giao dịch có thật và khoản chênh là khoản mất có thật.

Câu chuyện hoàn tiền không bị giấu: thẻ "Đã hoàn tiền" đếm thẳng từ sổ ví, **không lọc cohort**.

Bản sao của quy tắc này ở `AdminDashboardService.IsInRevenueCohort` phải sửa cùng lúc, nếu không
dashboard và báo cáo lại kể hai câu chuyện khác nhau về cùng một khoản tiền.

Code: `IsBooksClosed()`, `CohortBookings()`, `BuildClosedBookings()`.

### 2.1 Khoá đóng sổ giữa chừng — vì sao phải đọc sổ ví

Khoá dừng giữa chừng thì **không** suy được tiền bằng công thức, vì phần Tutora giữ lại
gồm **hai** khoản khác bản chất: hoa hồng của buổi đã dạy, **cộng** phần phí dịch vụ
không hoàn của những buổi bị huỷ. Nên lấy thẳng từ ba con số đã ghi sổ:

```
CashIn       = Remainingpaidat != null ? Finalprice
             : Depositpaidat   != null ? Depositamount : 0
Refunded     = Σ wallet_transactions type=Refund,        referencetable=booking
TutorPaid    = Σ wallet_transactions type=EscrowRelease, referencetable=booking
PlatformKept = clamp(CashIn − Refunded − TutorPaid, 0, PlatformFee)
```

Cùng công thức `CashIn` với `SettlementService.CancelRemainingSessionsAsync`, để sổ ví và
báo cáo không kể hai câu chuyện khác nhau về cùng một booking.

> **`EscrowReversal` KHÔNG được trừ.** Escrow của buổi chưa dạy bị *đảo* (rút khỏi
> `Frozenbalance`, gia sư không thực nhận) chứ không giải ngân. Gộp nó chung với
> `EscrowRelease` sẽ làm `PlatformKept` âm.

> **Chặn trên ở `PlatformFee` là điều kiện an toàn của cả cách làm này.** Dù sổ ví thiếu
> dòng (dữ liệu sửa tay dưới DB), doanh thu báo ra **không bao giờ vượt quá hoa hồng đã
> ký** — đúng bằng trần mà công thức hợp đồng có thể cho ra. Sai sót chỉ có thể theo hướng
> thiếu, không thể theo hướng thừa.

**Ví dụ nghiệp vụ đã chốt** — khoá 100.000đ/10 buổi, phí 5%+5%, học 1 buổi rồi admin huỷ:

| | Số tiền | Từ đâu ra |
|---|---:|---|
| Phụ huynh trả | 105.000 | `Finalprice` |
| Gia sư nhận | 9.500 | `Tutorfee 95.000 / 10 × 1 buổi đã dạy` |
| Hoàn phụ huynh | 90.000 | `giá gốc 100.000 / 10 × 9 buổi`, **không** gồm phí dịch vụ |
| **Tutora giữ** | **5.500** | `105.000 − 9.500 − 90.000` |

5.500 = **5.000 phí phụ huynh** (buổi đầu đã dạy nên hết đường hoàn) **+ 500 phí gia sư**
của đúng 1 buổi đã dạy. Công thức hai vế `EarnedSoFar` cho ra đúng 5.500 — từ khi tách phí
theo escrow, sổ ví và công thức **khớp nhau** ở mọi ca chuẩn, và `Adjustment` về 0.

> Vậy còn cần đọc sổ ví nữa không? **Có.** Nó vẫn là nguồn sự thật cho những ca công thức
> không mô tả được: hoàn tiền một phần theo khiếu nại, hoàn cả phí dịch vụ khi gia sư không
> phản hồi (`TutorResponseTimeoutPolicy` hoàn trọn `Depositamount`), và dữ liệu sửa tay dưới
> DB. Ở những ca đó `Adjustment` khác 0 và chỉnh lại đúng bằng số ví ghi — kể cả khi âm.
> Khác biệt so với trước: `Adjustment ≠ 0` nay là **dấu hiệu bất thường đáng soi**, chứ không
> còn là chuyện thường ngày của mọi khoá bị huỷ.

Test khoá lại kịch bản này: `MV.ApplicationLayer.Tests/CancelledBookingRevenueTests.cs`.

### 2.2 Mốc thời gian — vì sao chia làm hai

Doanh thu phải ở lại **đúng tháng dịch vụ được giao**. Nếu quy cả `PlatformKept` về một mốc
duy nhất thì khoá mở tháng 1, dạy suốt tháng 2, đóng tháng 3 sẽ dồn hết doanh thu vào
tháng 3 — biểu đồ xu hướng thành vô nghĩa và tháng 2 trống trơn. Nên tách:

```
Phí phụ huynh       → ghi tại max(ngày trả đợt đó, ngày buổi ĐẦU dạy xong)
Phí gia sư mỗi buổi → ghi tại NGÀY DẠY, cho MỌI booking, không phân biệt trạng thái
Adjustment          → ghi tại NGÀY CHỐT SỔ
                    = PlatformKept − EarnedSoFar(b, ∞, số buổi đã dạy)
```

Cộng lại vẫn đúng bằng `PlatformKept`. Với **khoá hoàn tất bình thường `Adjustment = 0`**,
tức cách tính mới không đụng gì tới nhóm chiếm đa số dữ liệu — đó là lý do mở rộng sang
mọi khoá đã chốt escrow là an toàn.

`Adjustment` **âm** là hợp lệ: ca hoàn tiền một phần theo khiếu nại, nơi Tutora giữ ít hơn
hoa hồng đã ghi nhận trước đó. Doanh thu tháng đó bị trừ lại — đúng bản chất kế toán.

**Ngày chốt sổ** = `Cancelledat`, hoặc nếu không có (khoá đóng bằng status `completed`) thì
lấy ngày buổi cuối được settle — sát thực tế hơn `Updatedat`, vốn đổi theo mọi lần sửa.

Hai hàm: `RecognisedIn()` (theo ngày dạy) và `ClosingAdjustmentIn()` (theo ngày chốt), luôn
được **cộng cùng nhau** ở mọi nơi báo "doanh thu ghi nhận".

---

## 3. Ba tầng số liệu — tính trên ba tập khác nhau

Đây là chỗ dễ sai nhất khi đối chiếu.

```
Ghi nhận sớm (Contracted)  = Σ PlatformFee của booking TẠO trong kỳ (cả cohort)
Thực hiện    (Recognised)  = Σ TutorCutPerSession của MỌI buổi settle trong kỳ (theo ngày dạy)
                           + Σ phí phụ huynh của đợt CHÍN trong kỳ            (§2 sliceMaturesAt)
                           + Σ Adjustment của khoá CHỐT SỔ trong kỳ            (§2.2)
Nợ dịch vụ   (Deferred)    = Σ UnearnedSoFar của booking CHƯA CHỐT SỔ, tính tới cuối kỳ
                             = phí phụ huynh chưa chín (chưa trả, HOẶC đã trả mà
                               chưa qua buổi đầu nên còn hoàn lại được 100%)
                             + phí gia sư của buổi CHƯA dạy
```

> **Khoá đã chốt sổ không sinh nợ dịch vụ.** Buổi chưa dạy của chúng đã bị huỷ, không còn
> là nghĩa vụ phải giao. Trước đây mọi booking `completed` đều lọt vào `Deferred`, nên khoá
> kết thúc sớm (dạy 1/10 buổi) báo 9 buổi nợ dịch vụ **suốt đời** — số đó không bao giờ
> thành tiền được nữa. Nay nó chuyển sang `CommissionLost` (§5), đúng bản chất.

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
| GMV | Σ `FinalPrice` của booking **cohort** tạo trong kỳ |
| Doanh thu thực hiện | `RecognisedIn(kỳ)` + `ClosingAdjustmentIn(kỳ)` + doanh thu AI trong kỳ |
| Ghi nhận sớm | `ContractedIn(kỳ)` + doanh thu AI trong kỳ |
| Nợ dịch vụ | `ComputeDeferred(tính tới cuối kỳ)` |
| Tiền mặt đã thu | Σ giao dịch `Succeeded` có `PaidAt` trong kỳ |

Phễu booking: đếm booking theo bậc trạng thái (`StatusRank`), booking huỷ / quá hạn
rơi khỏi phễu.

### Khối chia tiền — bốn số cộng khớp

Cùng phạm vi "booking cohort tạo trong kỳ":

```
Gmv            = TutorReceivable + CommissionSold
CommissionSold = CommissionEarned + CommissionLost + phần còn chờ

CommissionEarned = khoá chưa chốt sổ: FeePerSession × buổi đã settle
                 + khoá đã chốt sổ:   PlatformKept        (§2.1)
CommissionLost   = Σ (PlatformFee − PlatformKept) của khoá đã chốt sổ trong cohort
```

> **`CommissionLost` phải tách khỏi "chờ ghi nhận".** Chờ nghĩa là buổi học còn ở phía
> trước và tiền vẫn có cơ hội về; khoản này thì hết cơ hội — khoá bị huỷ, hoặc khách trả
> đợt 1 rồi bỏ dở. Gộp chung là báo cáo một khoản đã mất như thể vẫn đang chờ. Trên vành
> khuyên nó là lát đỏ riêng, nhãn **"Không thu được"**.

`CommissionFromCancelled` **không** thuộc khối này và không cộng được vào đâu: nó là số
luỹ kế **cả đời khoá**, quy về ngày huỷ, trong khi hoa hồng những buổi đã dạy của chính
khoá đó có thể đã ghi nhận từ kỳ trước. Chỉ dùng để đối soát sổ ví, trả lời đúng một câu:
*"kỳ này huỷ nhiều thế, rốt cuộc giữ lại được bao nhiêu"*.

---

## 6. Tab Gia sư

| Chỉ số | Công thức |
|---|---|
| GMV | Σ `FinalPrice` booking cohort của gia sư, tạo trong kỳ |
| Doanh thu nền tảng | Σ `FeePerSession` của buổi đã settle trong kỳ **+** `Adjustment` của khoá chốt sổ trong kỳ (§2.2) |
| Gia sư nhận | Σ `round(TutorFee / TotalSessions, 2)` của buổi đã settle **+** phần chênh so với số THỰC giải ngân khi khoá chốt sổ |
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

> **Gia sư có mặt trong kỳ** = có buổi trong kỳ **hoặc** có khoá chốt sổ trong kỳ. Thiếu
> vế thứ hai thì gia sư dạy từ kỳ trước mà khoá bị huỷ ở kỳ này sẽ không có dòng nào, dù
> tiền buổi đã dạy vừa được giải ngân cho họ trong chính kỳ này.

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
| ARPU tháng | `(RecognisedIn + ClosingAdjustmentIn)(tháng) / số khách hoạt động tháng đó` |
| Nợ dịch vụ | `Σ FeePerSession × (TotalSessions − đã settle)`, **chỉ khoá chưa chốt sổ** |

> Khách có khoá bị huỷ giữa chừng vẫn nằm trong tập tính LTV, tỷ lệ tái mua và cohort giữ
> chân: họ đã trả tiền thật. Loại ra là âm thầm bỏ sót cả một nhóm khách.

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

Nguồn: `wallet_transactions` với `transaction_type = 'Refund'`
**và `reference_table = 'booking'`**.

> **Không** dùng `Booking.Refundamount` — trường đó chỉ giữ số luỹ kế, **không có mốc
> thời gian** nên không quy được về kỳ báo cáo.

> **Bắt buộc lọc `reference_table`.** Ví còn một loại `Refund` khác gắn
> `reference_table = 'withdrawal'`: tiền trả về ví **gia sư** khi admin từ chối lệnh rút
> (`AdminPayoutService`). Đó không phải hoàn học phí — đếm vào sẽ thổi phồng cả thẻ
> "Đã hoàn tiền" lẫn tỷ lệ hoàn trên tiền mặt.

```
Hoàn tiền trong kỳ = Σ amount các giao dịch Refund có created_at trong kỳ
Tỷ lệ trên tiền mặt = hoàn tiền / tiền mặt đã thu trong kỳ × 100
```

**Đừng trừ số này vào doanh thu.** Hai lý do: sai đơn vị (đây là học phí gộp, doanh thu
chỉ là hoa hồng), và khoản hoàn của khoá đã huỷ **đã được trừ sẵn** khi tính
`PlatformKept` (§2.1).

### Bảng "Doanh thu theo booking"

Tập hiển thị **rộng hơn** cohort tính tiền:

```
cohort (§2)  ∪  { booking đã chết mà không có tiền: Cancelledat != null, hoặc payment_timeout }
```

Nhóm cộng thêm có **mọi cột tiền bằng 0**, nên dòng tổng ở chân bảng vẫn khớp với thẻ đầu
trang — chỉ số đếm "Tổng N booking" là đổi. Lý do đưa vào: giấu chúng thì admin đi tìm
*"lịch tôi vừa huỷ đâu rồi"* mà không có chỗ nào trả lời. Lịch còn **đang chờ**
(`pending_tutor` / `accepted` / `pending_payment`) vẫn nằm ngoài: chúng chưa chết, chỉ là
chưa tới lượt.

Hai cột tiền mặt đứng **trước** ba cột hoa hồng, để một dòng đã huỷ đọc từ trái sang phải ra
đúng câu chuyện: *khách trả 105.000 → hoàn 90.000 → Tutora giữ 5.500*.

| Cột | Nguồn |
|---|---|
| Khách trả | `CashIn` (§2.1) — chỉ tiền đợt 1 nếu chưa trả nốt, nên khác `FinalPrice` |
| Đã hoàn | Σ `wallet_transactions` type=Refund của booking đó |
| Hoa hồng Tutora | khoá đã chốt sổ: `PlatformKept` · chưa chốt: `PlatformFee` |
| Đã ghi nhận | khoá đã chốt sổ: `PlatformKept` · chưa chốt: `FeePerSession × buổi đã settle` |
| Chờ ghi nhận | hiệu hai cột trên — khoá đã chốt sổ **luôn bằng 0** |

Bộ lọc chia 3 nhóm theo cờ `Closed` của backend, **không** theo status: khoá bị đóng giữa
chừng vẫn mang status `completed` (§2), lọc theo status sẽ xếp nhầm chúng vào "đang chạy".
`payment_timeout` gom chung nhóm "Huỷ / quá hạn" — về mặt tiền nó cũng là một lịch chết.

> **Chỗ còn lệch — 6 booking `completed` + `escrow_status = holding` trên DB dev.**
> Trạng thái này tự mâu thuẫn (`sessions_remaining = 0` nhưng escrow chưa chốt), nên §2.1 không
> nhận ra chúng và rơi về công thức hợp đồng. Đa số vẫn ra đúng số, riêng booking #277 — đã
> hoàn 100% (78.750đ) mà escrow không được đánh dấu `refunded` — báo 7.500đ hoa hồng trong khi
> thực giữ 0đ.
>
> Cách chặn đúng là kẹp trần hoa hồng theo tiền mặt còn giữ: `≤ max(0, CashIn − Refunded)`.
> Guard này luôn đúng bất kể `escrow_status` sạch hay bẩn, và chỉ có tác dụng đúng ở ca đã hoàn
> gần hết tiền. **Chưa làm** vì phải sửa cả nhánh ghi nhận theo ngày dạy, và trước đó cần chốt
> với team BE xem 6 dòng đó là dữ liệu test hay có luồng nào quên cập nhật `escrow_status`.
> Đừng "sửa" bằng cách coi `sessions_remaining = 0` là đã chốt sổ: những booking còn escrow kẹt
> thật trong ví gia sư sẽ bị tính thành tiền Tutora giữ, tức sai theo hướng **thừa**.

---

## 9. Tab Môn & Lớp

| Chỉ số | Công thức |
|---|---|
| GMV | Σ `FinalPrice` booking cohort của môn, tạo trong kỳ |
| Doanh thu nền tảng | khoá chưa chốt sổ: Σ `FeePerSession` × buổi đã settle · khoá đã chốt: `PlatformKept` |
| Nợ dịch vụ | Σ `FeePerSession` × (TotalSessions − đã settle), **chỉ khoá chưa chốt sổ** |
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

5. **Sổ ví thiếu dòng** — §2.1 tin vào `wallet_transactions`. Nếu một khoá bị sửa tay dưới
   DB và thiếu dòng `EscrowRelease`, phần Tutora giữ sẽ bị tính cao hơn thật, tối đa tới
   trần `PlatformFee`. Chặn trên giữ cho sai số không vượt quá cái mà công thức hợp đồng
   vốn đã cho ra, nên đây là rủi ro **giới hạn được**, không phải lỗ hổng mở.

---

## 12. Tra nhanh theo file

| Nội dung | Vị trí |
|---|---|
| Toàn bộ công thức báo cáo | `Tutora-Backend/MV.ApplicationLayer/Services/AdminRevenueAnalyticsService.cs` |
| Khoá đóng sổ đọc từ sổ ví (§2.1) | cùng file — `BuildClosedBookings`, `LoadBookingLedgerAsync` |
| Test khoá lại ví dụ nghiệp vụ | `Tutora-Backend/MV.ApplicationLayer.Tests/CancelledBookingRevenueTests.cs` |
| Công thức phí gốc | `Tutora-Backend/MV.ApplicationLayer/Helpers/BookingFeeCalculator.cs` |
| Chia tiền khi huỷ giữa chừng | `Tutora-Backend/MV.ApplicationLayer/Helpers/LessonRefundCalculator.cs` |
| Hợp đồng dữ liệu (DTO) | `Tutora-Backend/MV.DomainLayer/DTO/ResponseModel/Admin/AdminRevenueAnalyticsResponse.cs` |
| Endpoint | `Tutora-Backend/MV.PresentationLayer/Controllers/AdminRevenueAnalyticsController.cs` |
| Khoảng thời gian | `tutora-cms/src/hooks/useRevenueReport.ts` |
| Giao diện 6 tab | `tutora-cms/src/pages/AdminRevenueReports/tabs/` |
