import AlternatingBlock from '@/components/AlternatingBlock';

export default function AlternatingBlockDemo() {
  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-center py-8">Alternating Block Demo</h1>
      
      {/* Example 1: Default Layout with Author */}
      <AlternatingBlock
        title="Welcome to Our Platform"
        subtitle="FEATURED"
        description="Discover amazing features and capabilities that will transform your workflow. Our platform offers cutting-edge solutions designed to help you succeed."
        image="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
        imageAlt="Modern workspace with laptop and coffee"
        ctaText="Get Started"
        ctaLink="/get-started"
        backgroundColor="bg-white"
        textColor="text-gray-900"
        author={{
          authorName: "John Doe",
          jobTitle: "Senior Developer",
          nationality: "USA",
          avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
          imageAltText: "John Doe - Senior Developer",
          authorIntro: "Meet the Author John Doe - Senior Developer with 5+ years of experience"
        }}
      />

      {/* Example 2: Reverse Layout */}
      <AlternatingBlock
        title="Advanced Analytics"
        subtitle="INSIGHTS"
        description="Get deep insights into your data with our powerful analytics tools. Track performance, identify trends, and make data-driven decisions."
        image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
        imageAlt="Data analytics dashboard"
        ctaText="View Analytics"
        ctaLink="/analytics"
        reverseLayout={true}
        backgroundColor="bg-gray-50"
        textColor="text-gray-900"
      />

      {/* Example 3: Dark Theme */}
      <AlternatingBlock
        title="Enterprise Solutions"
        subtitle="SCALABLE"
        description="Scale your business with our enterprise-grade solutions. Built for reliability, security, and performance at any scale."
        image="https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2126&q=80"
        imageAlt="Modern office building"
        ctaText="Contact Sales"
        ctaLink="/contact-sales"
        backgroundColor="bg-gray-900"
        textColor="text-white"
        paddingTop="xl"
        paddingBottom="xl"
      />

      {/* Example 4: Multiple Authors */}
      <AlternatingBlock
        title="Team Collaboration"
        subtitle="TEAM"
        description="Meet our amazing team of experts who work together to deliver exceptional results. Collaboration is at the heart of everything we do."
        image="https://images.unsplash.com/photo-1522071820081-009f0129c71c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
        imageAlt="Team collaboration meeting"
        ctaText="Meet the Team"
        ctaLink="/team"
        backgroundColor="bg-blue-50"
        textColor="text-blue-900"
        author={[
          {
            authorName: "Jane Smith",
            jobTitle: "Product Manager",
            nationality: "Canada",
            avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
            imageAltText: "Jane Smith - Product Manager",
            authorIntro: "Meet Jane Smith - Product Manager with 3+ years of experience"
          },
          {
            authorName: "Mike Johnson",
            jobTitle: "Design Lead",
            nationality: "UK",
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80",
            imageAltText: "Mike Johnson - Design Lead",
            authorIntro: "Meet Mike Johnson - Design Lead with 4+ years of experience"
          }
        ]}
        paddingTop="md"
        paddingBottom="md"
      />
    </div>
  );
}
