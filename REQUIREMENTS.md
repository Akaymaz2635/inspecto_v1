# Muayene Yönetim Sistemi — Gereksinim Belgesi

## 1. Amaç

Üretim sürecinde tespit edilen görsel kusurları kayıt altına almak, her kusur için alınan disposition kararlarını (kişi/tarih/referans ile birlikte) denetlenebilir biçimde saklamak ve operasyonun uygunluk durumunu izlemek.

---

## 2. Varlık Hiyerarşisi

```
Motor Projesi
  └── Parça Kodu
        └── Seri Numarası
              └── Operasyon Numarası
                    └── Muayene Kaydı
                          └── Kusur (Defect)
                                └── Disposition Geçmişi (Audit Log)
```

| Seviye             | Açıklama                                                |
|--------------------|---------------------------------------------------------|
| Motor Projesi      | Üst düzey proje (ör. TS1400, PD170)                     |
| Parça Kodu         | Projeye ait parça tipi tanımı                           |
| Seri Numarası      | O parça kodunun belirli bir fiziksel örneği             |
| Operasyon Numarası | Muayenenin gerçekleştirildiği üretim operasyonu         |

**Operasyon tamamlanma kuralı:** Bir operasyondaki tüm kusurlar "neutralized" (karara bağlanmış) duruma geldiğinde operasyon uygun/tamamlanmış sayılır.

---

## 3. Roller ve Sistem Kullanımı

> **Önemli:** Fiziksel süreç hardcopy router üzerinden yürür. Sistem bu sürecin dijital yansımasıdır.
> **Sisteme veri girişi her zaman inspector tarafından yapılır.**

| Rol       | Fiziksel Süreçteki Görevi                                                   | Sistemdeki Eylemi                         |
|-----------|-----------------------------------------------------------------------------|-------------------------------------------|
| Inspector | Kusuru tespit eder, ölçer, fotoğrafını çeker; mühendis/MRB kararını routerda kontrol eder; mavi mühür vurur | Kusur kaydı oluşturur; disposition girer  |
| Mühendis  | Raporu inceler; USE_AS_IS veya REWORK kararını hardcopy routera yazar       | Sisteme doğrudan müdahalesi yok           |
| MRB       | Case record değerlendirir; concession numarası ile kabul verir              | Sisteme doğrudan müdahalesi yok           |

**Router mühür anlamları:**
- 🔵 Mavi mühür = Uygun / Kabul
- 🔴 Kırmızı mühür = Ret

---

## 4. Disposition Senaryoları

### Senaryo 1 — USE_AS_IS (Spec Dahilinde Kabul)

```
1. Inspector kusurun fotoğraf + ölçümlerini sisteme girer.
2. Mühendis fiziksel raporu inceler → hata spec limitlerinde.
3. Mühendis, kararı hardcopy routera yazar; parçayı evrakla inspector'a teslim eder.
4. Inspector routerı kontrol eder → mavi mühür vurur.
5. Inspector sistemde kusuru günceller: disposition = USE_AS_IS.
```

**Sisteme girilecek bilgiler:**
- Spec numarası (ör. `ENG-SPEC-4421`)
- Kararı veren mühendis adı
- Karar tarihi

**Otomatik oluşan not:**
> `Accepted according to [spec_number] by [engineer] [date]`

**Sonuç:** Kusur neutralized → Operasyondaki tek hata buysa operasyon tamamlandı.

---

### Senaryo 2 — REWORK (Hata Giderimi)

```
1. Inspector kusurun fotoğraf + ölçümlerini sisteme girer.
2. Mühendis fiziksel raporu inceler → rework gerekli.
3. Mühendis, rework dispositionını hardcopy routera yazar.
4. Rework işlemi uygulanır; parça yeniden inspect adımına gelir.
5. Inspector hata giderilmişse mavi mühür vurur.
6. Inspector sistemde kusuru günceller: disposition = REWORK.
```

**Sisteme girilecek bilgiler:**
- Kararı veren mühendis adı (dispositioned by)
- Yeniden muayene yapan inspector adı (re-inspected by)
- Tarih

**Otomatik oluşan not:**
> `After Rework Conforms dispositioned by [engineer] re-inspected by [inspector] [date]`

**Sonuç:** Kusur neutralized → Operasyondaki tek hata buysa operasyon tamamlandı.

---

### Senaryo 3 — MRB (Tasarım Org. Kabulü)

```
1. Inspector kusurun fotoğraf + ölçümlerini sisteme girer.
2. Mühendis fiziksel raporu inceler → hata giderilemez, hurda riski var.
3. Mühendis case record oluşturur; tasarım ekibine sunar.
4. Tasarım ekibi kabul eder → case record bir concession numarası alır.
5. Inspector concession evrakını inceler → hata tanımıyla uyuşuyor → mavi mühür.
6. Inspector sistemde kusuru günceller: disposition = MRB.
```

**Sisteme girilecek bilgiler:**
- Concession numarası (MRB referans no)
- Tarih

**Otomatik oluşan not:**
> `Accepted by MRB [concession_number] [date]`

**Sonuç:** Kusur neutralized → Operasyondaki tek hata buysa operasyon tamamlandı.

---

### Senaryo 4 — VOID (Geçersiz Sayma)

```
1. Inspector önceden girilen kusurun yanlış tanımlandığını fark eder
   (hatalı tarifleme / yanlış tespit).
2. Inspector sistemde kusuru VOID olarak günceller.
```

**Sisteme girilecek bilgiler:**
- Geçersizlik gerekçesi (serbest metin)

**Otomatik oluşan not:**
> `Voided by [inspector] [date] — [reason]`

**Sonuç:** Kusur neutralized (geçersiz).

---

## 5. Disposition Geçmişi (Audit Trail)

- Bir kusur birden fazla disposition kaydına sahip olabilir (ör. önce `REWORK`, sonra `MRB`).
- **En son kayıt = aktif karar.**
- Önceki kayıtlar silinmez; sadece okunur (immutable log).

### Veri Modeli

```
dispositions:
  id            INT  PK
  defect_id     INT  FK → defects.id
  decision      ENUM  (USE_AS_IS | REWORK | MRB | VOID)
  entered_by    TEXT  — sisteme giren inspector adı
  decided_at    DATE  — hardcopy routerdaki karar tarihi
  note          TEXT  — otomatik oluşan standart not
  -- USE_AS_IS için:
  spec_ref      TEXT  — spec numarası
  engineer      TEXT  — kararı veren mühendis
  -- REWORK için:
  engineer      TEXT  — dispositionı veren mühendis
  reinspector   TEXT  — yeniden muayene yapan inspector
  -- MRB için:
  concession_no TEXT  — concession / case record numarası
  -- VOID için:
  void_reason   TEXT  — geçersizlik gerekçesi
  created_at    DATETIME — sisteme giriş zamanı
```

---

## 6. Mevcut Veri Modeli

```
projects        : id, name, description, customer, created_at, updated_at
defect_types    : id, name, description, severity(low/medium/high/critical)
inspections     : id, project_id, part_number, serial_number, operation_number,
                  inspector, date, status(open/completed/rejected), notes
defects         : id, inspection_id, defect_type_id, depth, width, length,
                  radius, angle, color, notes
photos          : id, inspection_id, filename, created_at
photo_defects   : photo_id, defect_id   ← many-to-many junction
```

> `inspections.status` muayene düzeyindeki genel durumu gösterir (open/completed/rejected).
> Disposition ise kusur düzeyindeki teknik kararı ifade eder; bunlar ayrı kavramlardır.

---

## 7. Yapılacaklar (Backlog)

- [ ] `dispositions` tablosu + backend endpoint'leri
- [ ] Kusur düzenleme formuna disposition alanları (senaryo bazlı dinamik form)
- [ ] Kusur listesinde aktif disposition durumu ve notu göster
- [ ] Operasyon tamamlanma mantığı: tüm kusurlar neutralized → status = completed
- [ ] PDF/CSV rapor: muayene + kusurlar + disposition geçmişi
- [ ] Settings sayfası
- [ ] Hiyerarşi: parça kodu ve seri numarası ilerleyen aşamada ayrı varlıklar olarak normalize edilebilir
