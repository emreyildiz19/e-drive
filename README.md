# e-Drive

Elektrikli araçlar için rota ve şarj planlayıcı. Nereye gideceğini seçiyorsun;
uygulama rotayı çiziyor, yol üstündeki şarj istasyonlarını buluyor ve **nerede
kaç dakika şarj etmen gerektiğini** hesaplayıp öneriyor.

iOS + Android, React Native (Expo SDK 57).

## Neden anahtarsız çalışıyor

Hiçbir ücretli servise bağlı değil, kredi kartı istemiyor:

| İş | Servis | Anahtar |
|---|---|---|
| Harita | **Apple Maps** (iOS) / Google Maps (Android) | Gerekmez (iOS) |
| Rota | **OSRM** | Gerekmez |
| Adres arama | **Photon** (OpenStreetMap) | Gerekmez |
| Şarj istasyonları | **OpenStreetMap / Overpass** | Gerekmez |

İsteğe bağlı olarak iki **ücretsiz** servis eklenebilir (Ayarlar ekranından):

- **OpenRouteService** — daha stabil rota, günlük 2000 istek.
  [Ücretsiz anahtar](https://openrouteservice.org/dev/#/signup)
- **Open Charge Map** — istasyonların gücü ve konnektörleri daha eksiksiz gelir.
  Türkiye'nin doğusunda OSM verisi zayıf olduğu için bu anahtar kapsamayı
  belirgin artırır. [Ücretsiz anahtar](https://openchargemap.org/site/profile/applications)

## Kurulum ve çalıştırma

```bash
npm install
npx expo start
```

Telefonda **Expo Go** uygulamasını App Store'dan kur, terminaldeki QR kodu
Kamera ile okut. Bilgisayar ve telefon aynı Wi-Fi'da olmalı. Aynı ağda
değilseniz veya kurumsal ağdaysanız:

```bash
npx expo start --tunnel
```

### iPhone'a bağımsız uygulama olarak kurmak (Mac gerekir)

Expo Go olmadan, ana ekranda kendi ikonuyla duran gerçek bir uygulama için:

```bash
# Mac'te, projenin kök dizininde
npm install
npx expo prebuild -p ios       # ios/ klasörünü üretir
npx expo run:ios --device      # bağlı iPhone'a derleyip kurar
```

Gerekenler: **Xcode** (App Store'dan) ve **CocoaPods**
(`sudo gem install cocoapods` veya `brew install cocoapods`). İlk çalıştırmada
Xcode imzalama takımı ister:

- **Ücretsiz Apple ID** ile imzalanırsa uygulama **7 gün** sonra açılmaz,
  aynı komutla yeniden kurmak gerekir.
- **Apple Developer Program** (99 $/yıl) ile 1 yıl geçerli olur ve
  `eas build` ile Mac'e hiç bağlanmadan havadan da kurulabilir.

iPhone'da ilk açılışta *Ayarlar → Genel → VPN ve Cihaz Yönetimi* altından
geliştirici sertifikasına güven vermek gerekir.

Not: `ios/` ve `android/` klasörleri `.gitignore`'da — `prebuild` onları her
makinede yeniden üretir, depoda tutulmaları gerekmez.

## Nasıl çalışıyor

### 1. Rota

`src/lib/api/routing.ts` — OSRM'den (veya anahtar varsa OpenRouteService'ten)
rota geometrisi ve **adım adım hız profili** alınır. Hız profili önemli:
otoyolda 120 km/h ile giden bir araç, şehir içi 60 km/h'ye göre kilometrede
belirgin daha fazla enerji harcar. Rotanın her parçası kendi ortalama hızıyla
hesaplanır.

### 2. Şarj istasyonları

`src/lib/api/chargers.ts` — rota koridoru, dikdörtgenlerin birleşimi olarak tek
bir Overpass sorgusuna çevrilir.

> Neden bbox? Overpass'a uzun bir çokgen (`around:` + 56 nokta) vermek 666 km'lik
> bir rotada zaman aşımına düşüyordu. Aynı alan bbox filtresiyle ~2 saniyede
> geliyor; koridor dışında kalanları zaten yerel olarak sapma mesafesine göre
> eliyoruz.

Türkiye'deki OSM kayıtlarının yarısından fazlasında soket ve güç etiketi yok.
Elde ne varsa kullanılıyor: `socket:*` etiketleri, `voltage`+`amperage`
(400 V / 32 A → 22 kW üç fazlı), isim alanındaki serbest metin
("ZES ... 22kw AC"), ve DC ağırlıklı işletmeci adları (Trugo, Astor, Voltrun…).

Bilinmeyen bir istasyon **asla DC varsayılmaz** — plan o istasyona güvenip yola
çıkardı. Tahmin edilen değerler arayüzde `~` ile ve ayrı bir uyarıyla gösterilir.

### 3. Enerji modeli

`src/lib/energy.ts`

- **Hız:** yuvarlanma direnci sabit, aerodinamik direnç hızın karesiyle artar.
  90 km/h referans: 120'de ×1.37, 70'te ×0.83.
- **Sıcaklık:** kabin ısıtması ve batarya verimi. 20 °C'de ×1.00, 0 °C'de ×1.24,
  −10 °C'de ×1.38.
- **Sürüş tarzı:** ekonomik ×0.92, normal ×1.00, hızlı ×1.16.
- **Şarj eğrisi:** DC güç, batarya doldukça düşer. %20'ye kadar tam güç,
  %80'de ×0.57, %95'te ×0.22. Bu yüzden yolculukta %80'de kesmek genelde
  toplam süreyi kısaltır.

### 4. Durak optimizasyonu

`src/lib/optimizer.ts` — burası işin özü.

Açgözlü ("menzil içindeki en iyi istasyonu seç") yaklaşım bu problemi doğru
çözmüyor. Gerçek veriyle test edildiğinde iki ayrı şekilde bozuluyordu:

- Yolun ilk 40 km'sinde birbiri ardına **4-5 dakikalık anlamsız molalar**
  zinciri kuruyordu (her biri tek başına "verimli" görünüyor).
- %100 şarjla yola çıkan küçük bataryalı bir araçta, üst şarj sınırının
  üstünde gelinen istasyonların **hepsi eleniyordu**.

Doğru kurgu, düğümleri **(istasyon × şarj seviyesi)** olan bir grafta en kısa
*süre*yi aramak. Kenar maliyeti dakika olduğu için Dijkstra doğrudan en kısa
süreli yolculuğu veriyor. Bir istasyondan şarj etmeden geçmek de bir kenar
olduğundan hiçbir istasyon elenmiyor.

Ölçüm (İstanbul → Van, 1520 km, 104 istasyon): plan hesabı **medyan 3 ms**.
Bu yüzden şarj yüzdesi kaydırıcısı oynatıldığında plan anında güncelleniyor.

Sonuç, gerçek EV stratejisiyle örtüşüyor: bataryayı düşükten al, eğrinin hızlı
bölgesinde şarj et, tepeye kadar doldurma. İstanbul → Antalya, Togg T10X Uzun
Menzil, %80, −5 °C → 3 durak, toplam 38 dk şarj.

### 5. Öneriler

`src/lib/planner.ts` optimizasyon sonucunu okunabilir hale getirir ve duruma
göre öneri üretir: soğuk hava etkisi, varış tamponu dar kaldığında uyarı, aynı
bacakta daha hızlı bir istasyon varsa kaç dakika kazandıracağı, Tesla
işletmeli duraklarda erişim uyarısı, veri kalitesi düşük duraklar.

## Proje yapısı

```
App.tsx                     harita, akış, üst arama çubuğu, alt panel
src/types.ts                paylaşılan tipler
src/theme.ts                renk paleti (açık/koyu), güç renk skalası
src/data/vehicles.ts        140 elektrikli araç: batarya, tüketim, DC hızı, konnektör
src/lib/geo.ts              haversine, polyline çözücü, rotaya izdüşüm
src/lib/energy.ts           tüketim modeli ve şarj eğrisi
src/lib/optimizer.ts        durak optimizasyonu (Dijkstra)
src/lib/planner.ts          plan çıktısı, alternatifler, öneriler
src/lib/api/routing.ts      OSRM + OpenRouteService
src/lib/api/chargers.ts     Overpass + Open Charge Map, OSM etiket ayrıştırma
src/lib/api/geocode.ts      Photon ile yer arama
src/store/settings.tsx      kalıcı ayarlar (AsyncStorage)
src/ui/                     bileşenler ve paneller
```

## Araç veritabanı

140 model (Togg, Tesla, Hyundai, Kia, BYD, VW grubu, BMW, Mercedes, Renault,
Stellantis, MG, Volvo/Polestar, Çin markaları, ticari araçlar). Marka ve model
seçince batarya kapasitesi, gerçek dünya tüketimi, DC tepe gücü ve konnektör
tipi otomatik geliyor.

Değerler yaklaşıktır (üretici verisi + gerçek dünya ortalamaları). Araç
seçim ekranından batarya ve tüketimi elle düzeltebilirsin; kendi aracının
gerçek tüketimini biliyorsan plan hemen isabetlenir. Listede olmayan araçlar
için **Diğer → Elle gir**.

## Bilinen sınırlar

- **Rakım hesaba katılmıyor.** Uzun tırmanışlarda gerçek tüketim tahminden
  yüksek olur. Varış tamponunu (varsayılan %10) bu yüzden düşürmemek iyi olur.
- **İstasyon doluluğu bilinmiyor.** Açık veride anlık doluluk yok; kritik bir
  durağı işletmecinin uygulamasından teyit et.
- **Doğu Anadolu'da OSM verisi zayıf.** Open Charge Map anahtarı eklemek
  kapsamayı belirgin artırır.
- **OSRM demo sunucusu** halka açık ve garantisiz; yoğun saatlerde yavaşlayabilir.
  OpenRouteService anahtarı eklenirse önce o denenir.
- Overpass sonuçları 10 dakika önbelleklenir, aynı rota yeniden planlanırken
  sunucu tekrar yorulmaz.

## Veri kaynakları

Şarj istasyonu ve adres verisi © OpenStreetMap katkıcıları, [ODbL](https://opendatacommons.org/licenses/odbl/)
lisansı altında. Rota: OSRM / OpenRouteService. Ek istasyon verisi: Open Charge Map.
