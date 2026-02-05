export type Lang = "id" | "en";

export type Dict = Record<string, { id: string; en: string }>;

export const dict: Dict = {
  // Global
  "lang.id": { id: "ID", en: "ID" },
  "lang.en": { id: "EN", en: "EN" },

  // Navbar
  "nav.home": { id: "Beranda", en: "Home" },
  "nav.services": { id: "Layanan", en: "Services" },
  "nav.packages": { id: "Paket", en: "Packages" },
  "nav.blog": { id: "Blog", en: "Blog" },
  "nav.about": { id: "Tentang Kami", en: "About Us" },
  "nav.contact": { id: "Kontak", en: "Contact" },
  "nav.login": { id: "Masuk", en: "Login" },
  "nav.getStarted": { id: "Mulai", en: "Get Started" },

  // Footer
  "footer.privacy": { id: "Kebijakan Privasi", en: "Privacy Policy" },
  "footer.terms": { id: "Syarat Layanan", en: "Terms of Service" },

  // Home
  "home.seoTitle": { id: "EasyMarketingAssist | Pemasaran Digital Mudah", en: "EasyMarketingAssist | Easy Digital Marketing" },
  "home.seoDesc": { id: "Cari domain dan dapatkan website profesional dalam hitungan menit.", en: "Search a domain and get a professional website in minutes." },
  "home.h1a": { id: "Pemasaran Digital Mudah untuk", en: "Easy Digital Marketing for" },
  "home.h1b": { id: "Pemilik Bisnis yang Sibuk", en: "Busy Business Owners" },
  "home.heroSub": {
    id: "Cari domain dan mulai membangun website profesional dengan mudah.",
    en: "Search a domain and get a professional website in minutes.",
  },
  "home.heroPill1": { id: "Tanpa kontrak", en: "No contracts" },
  "home.heroPill2": { id: "Dukungan personal", en: "Personal support" },
  "home.heroPill3": { id: "Harga terjangkau", en: "Affordable pricing" },

  "home.howItWorks": { id: "Cara Kerjanya", en: "How It Works" },
  "home.howItWorksSub": { id: "Mulainya gampang. Begini cara kita bekerja bersama.", en: "Getting started is simple. Here's how we'll work together." },

  "home.whoItsFor": { id: "Untuk Siapa", en: "Who It's For" },
  "home.whoItsForSub": { id: "Cocok untuk pemilik bisnis yang ingin fokus pada hal yang paling penting.", en: "Perfect for business owners who want to focus on what they do best." },

  "home.helpWith": { id: "Yang Bisa Kami Bantu", en: "What We Can Help With" },
  "home.helpWithSub": { id: "Marketing assist kamu bisa menangani berbagai tugas untuk mengembangkan bisnismu.", en: "Your marketing assist can handle a variety of tasks to grow your business." },
  "home.viewAllServices": { id: "Lihat Semua Layanan", en: "View All Services" },

  "home.ctaTitle": { id: "Siap Mengembangkan Bisnismu?", en: "Ready to Grow Your Business?" },
  "home.ctaSub": { id: "Dapatkan marketing assist khusus hari ini. Tanpa kontrak, tanpa overhead agensi.", en: "Get your dedicated marketing assist today. No contracts, no agency overhead." },
  "home.ctaPackages": { id: "Lihat Paket", en: "View Packages" },
  "home.ctaContact": { id: "Hubungi Kami", en: "Contact Us" },

  // Domain search
  "domain.placeholder": { id: "Masukkan nama domain", en: "Enter your domain name" },
  "domain.search": { id: "Cari Domain", en: "Search Domain" },
  "domain.pressEnter": { id: "Tekan Enter untuk mencari", en: "Press Enter to search" },
  "domain.example": { id: "Contoh:", en: "Example:" },

  // Order shared
  "order.summary": { id: "Ringkasan Order", en: "Order Summary" },
  "order.domain": { id: "Domain", en: "Domain" },
  "order.plan": { id: "Paket", en: "Plan" },
  "order.price": { id: "Harga", en: "Price" },
  "order.promo": { id: "Promo", en: "Promo" },
  "order.status": { id: "Status", en: "Status" },
  "order.template": { id: "Template", en: "Template" },
  "order.included": { id: "Termasuk", en: "What’s included" },

  // Order steps/titles
  "order.step.domain": { id: "Pilih Domain", en: "Choose Domain" },
  "order.step.design": { id: "Pilih Desain", en: "Choose Design" },
  "order.step.details": { id: "Data Anda", en: "Your Details" },
  "order.step.plan": { id: "Paket Berlangganan", en: "Subscription Plan" },
  "order.step.payment": { id: "Pembayaran", en: "Payment" },

  // Choose domain
  "order.domainResult": { id: "Hasil domain", en: "Domain result" },
  "order.searchToCheck": { id: "Cari untuk cek ketersediaan", en: "Search to check availability" },
  "order.table.domain": { id: "Domain", en: "Domain" },
  "order.table.status": { id: "Status", en: "Status" },
  "order.table.price": { id: "Harga", en: "Price" },
  "order.continueDesign": { id: "Lanjut ke Desain", en: "Continue to Design" },

  // Choose design
  "order.filterTitle": { id: "Filter & cari template", en: "Filter & search template" },
  "order.searchTemplates": { id: "Cari template", en: "Search templates" },
  "order.category": { id: "Kategori", en: "Category" },
  "order.all": { id: "Semua", en: "All" },
  "order.preview": { id: "Pratinjau", en: "Preview" },
  "order.select": { id: "Pilih", en: "Select" },
  "order.selected": { id: "Dipilih", en: "Selected" },
  "order.continueDetails": { id: "Lanjut ke Data", en: "Continue to Details" },

  // Details
  "order.contactInfo": { id: "Informasi kontak", en: "Contact information" },
  "order.name": { id: "Nama", en: "Name" },
  "order.email": { id: "Email", en: "Email" },
  "order.country": { id: "Negara", en: "Country" },
  "order.selectCountry": { id: "Pilih negara", en: "Select country" },
  "order.companyOptional": { id: "Perusahaan (opsional)", en: "Company (optional)" },
  "order.termsAgree": { id: "Saya setuju dengan syarat", en: "I agree to the terms" },
  "order.updateLater": { id: "Kamu bisa mengubah detail nanti di dashboard.", en: "You can update details later in dashboard." },
  "order.continueSubscription": { id: "Lanjut ke Paket", en: "Continue to Subscription" },

  // Subscription
  "order.chooseDuration": { id: "Pilih durasi paket", en: "Choose plan duration" },
  "order.includesCosts": { id: "Termasuk domain, hosting, dan biaya template website.", en: "Includes domain, hosting, and website template costs." },
  "order.allIn": { id: "All-in (domain + hosting + template)", en: "All-in (domain + hosting + template)" },
  "order.totalFor": { id: "Total untuk {years} tahun", en: "Total for {years} year(s)" },
  "order.noteDefaultPackage": { id: "Catatan: harga hosting & template mengikuti Default Package di Domain Tools.", en: "Note: hosting and template pricing follows the Default Package in Domain Tools." },
  "order.continuePayment": { id: "Lanjut ke Pembayaran", en: "Continue to Payment" },

  // Payment
  "order.loadingPayment": { id: "Memuat opsi pembayaran…", en: "Loading payment options…" },
  "order.gatewayInactiveTitle": { id: "Gateway pembayaran belum aktif", en: "Payment gateway is not active" },
  "order.gatewayInactiveBody": { id: "Saat ini belum ada gateway pembayaran yang terkonfigurasi (Xendit/PayPal/Midtrans). Silakan aktifkan salah satu gateway di dashboard Super Admin, lalu kembali ke halaman ini.", en: "No payment gateway is configured yet (Xendit/PayPal/Midtrans). Please enable one in Super Admin, then return to this page." },
  "order.configStatus": { id: "Status konfigurasi", en: "Configuration status" },
  "order.paymentMethod": { id: "Metode pembayaran", en: "Payment method" },
  "order.card": { id: "Kartu", en: "Card" },
  "order.bankTransfer": { id: "Transfer bank", en: "Bank transfer" },
  "order.bankTransferNote": { id: "Flow transfer bank bisa ditambahkan nanti. Untuk sekarang, pilih Kartu.", en: "Bank transfer flow can be added next. For now, please choose Card." },
  "order.cardNumber": { id: "Nomor kartu", en: "Card number" },
  "order.promoCode": { id: "Kode promo", en: "Promo code" },
  "order.apply": { id: "Terapkan", en: "Apply" },
  "order.promoCleared": { id: "Promo dibersihkan", en: "Promo cleared" },
  "order.unableApplyPromo": { id: "Tidak bisa menerapkan promo", en: "Unable to apply promo" },
  "order.totalNotAvailableYet": { id: "Total belum tersedia.", en: "The total amount is not available yet." },
  "order.invalidPromo": { id: "Kode promo tidak valid", en: "Invalid promo code" },
  "order.promoNotFound": { id: "Kode promo tidak ditemukan atau tidak aktif.", en: "The promo code was not found or is not active." },
  "order.promoApplied": { id: "Promo diterapkan", en: "Promo applied" },
  "order.finalReview": { id: "Review akhir", en: "Final review" },
  "order.priceBreakdown": { id: "Rincian harga", en: "Price breakdown" },
  "order.amount": { id: "Total", en: "Amount" },
  "order.reviewNote": { id: "Silakan cek domain, desain, dan detail kamu di Ringkasan Order.", en: "Please review your domain, chosen design, and details in the Order Summary." },
  "order.pay": { id: "Bayar", en: "Pay" },
  "order.confirmPayment": { id: "Konfirmasi pembayaran", en: "Confirm payment" },
  "order.processing": { id: "Memproses...", en: "Processing..." },
  "order.cancel": { id: "Batal", en: "Cancel" },
  "order.confirmAndPay": { id: "Konfirmasi & Bayar", en: "Confirm & Pay" },
  "order.confirmContinue": { id: "Konfirmasi & Lanjut", en: "Confirm & Continue" },
  "order.redirectXendit": { id: "Kamu akan diarahkan ke checkout Xendit Invoice.", en: "You will be redirected to Xendit Invoice checkout." },
  "order.midtransIdrNote": { id: "Saat verifikasi 3DS, Midtrans mungkin menampilkan nominal dalam IDR.", en: "During 3DS verification, Midtrans may display the amount in IDR." },
  "order.payWithXendit": { id: "Bayar via Xendit", en: "Pay with Xendit" },
  "order.payWithCard": { id: "Bayar dengan Kartu", en: "Pay with Card" },
  "order.paypalLoading": { id: "Memuat PayPal…", en: "Loading PayPal…" },
  "order.paypalNotReady": { id: "PayPal belum bisa dipakai. Pastikan domain, template, dan total sudah siap.", en: "PayPal can't be used yet. Make sure domain, template, and total are ready." },
  "order.paypalNotConfigured": { id: "Belum dikonfigurasi", en: "Not configured" },

  // Generic buttons
  "common.back": { id: "Kembali", en: "Back" },
};

export function formatTemplate(dictEntry: string, vars?: Record<string, string | number>) {
  if (!vars) return dictEntry;
  return dictEntry.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}
