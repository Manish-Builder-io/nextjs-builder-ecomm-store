"use client";

export interface TestimonialItem {
  id: number;
  quote: string;
  name: string;
  location: string;
  initials: string;
  color: string;
  rating: number;
  product: string;
}

export interface TrustBadgeItem {
  icon: string;
  title: string;
  desc: string;
}

export interface TestimonialsSectionProps {
  heading?: string;
  subheading?: string;
  testimonials?: TestimonialItem[];
  trustBadges?: TrustBadgeItem[];
}

const testimonials = [
  {
    id: 1,
    quote:
      "Amazing quality and lightning-fast delivery. The Oxford shirt fits perfectly and the fabric is so comfortable. I've already ordered three more colours.",
    name: "Sarah M.",
    location: "New York, USA",
    initials: "SM",
    color: "bg-pink-500",
    rating: 5,
    product: "Classic Oxford Shirt",
  },
  {
    id: 2,
    quote:
      "I've been shopping here for two years and the quality never disappoints. Customer service is top-notch and returns are completely hassle-free.",
    name: "James R.",
    location: "London, UK",
    initials: "JR",
    color: "bg-blue-600",
    rating: 5,
    product: "Slim Fit Denim",
  },
  {
    id: 3,
    quote:
      "The floral wrap dress is absolutely stunning. I got so many compliments at my friend's wedding. The fabric feels luxurious and the fit is perfect.",
    name: "Priya K.",
    location: "Mumbai, India",
    initials: "PK",
    color: "bg-violet-500",
    rating: 5,
    product: "Floral Wrap Dress",
  },
];

const trustBadges = [
  { icon: "🚚", title: "Free Shipping", desc: "On orders over $50" },
  { icon: "🔄", title: "Free Returns", desc: "30-day return policy" },
  { icon: "🔒", title: "Secure Payment", desc: "100% secure checkout" },
  { icon: "💬", title: "24/7 Support", desc: "Dedicated customer care" },
];

export default function TestimonialsSection({
  heading = "Loved by 50,000+ Customers",
  subheading = "What our customers say",
  testimonials: testimonialsProp = testimonials,
  trustBadges: trustBadgesProp = trustBadges,
}: TestimonialsSectionProps) {
  return (
    <section className="bg-gray-50 py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-600">
            {subheading}
          </p>
          <h2 className="text-4xl font-extrabold text-gray-900">
            {heading}
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {testimonialsProp.map((t) => (
            <div
              key={t.id}
              className="flex flex-col rounded-2xl border border-gray-100 bg-white p-8 shadow-sm"
            >
              {/* Stars */}
              <div className="mb-5 flex gap-1">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <svg key={i} className="h-5 w-5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Quote */}
              <p className="flex-1 leading-relaxed text-gray-700">
                &ldquo;{t.quote}&rdquo;
              </p>

              {/* Author */}
              <div className="mt-6 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${t.color}`}
                >
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">
                    {t.location} · Bought: {t.product}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {trustBadgesProp.map((b) => (
            <div key={b.title} className="flex flex-col items-center gap-2">
              <span className="text-3xl">{b.icon}</span>
              <p className="font-semibold text-gray-900">{b.title}</p>
              <p className="text-sm text-gray-500">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
