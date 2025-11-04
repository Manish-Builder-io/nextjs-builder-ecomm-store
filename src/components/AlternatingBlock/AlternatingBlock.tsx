"use client";

import React from 'react';

interface AuthorData {
  jobTitle?: string;
  avatar?: string;
  nationality?: string;
  imageAltText?: string;
  authorName?: string;
  image?: string;
  authorIntro?: string;
}

interface AlternatingBlockProps {
  // Author reference - can be single author or array
  author?: AuthorData | AuthorData[];
  // Additional props for the alternating block
  title?: string;
  subtitle?: string;
  description?: string;
  image?: string;
  imageAlt?: string;
  ctaText?: string;
  ctaLink?: string;
  reverseLayout?: boolean;
  backgroundColor?: string;
  textColor?: string;
  paddingTop?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  paddingBottom?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

const AlternatingBlock: React.FC<AlternatingBlockProps> = ({
  author,
  title = "Default Title",
  subtitle,
  description = "Default description text",
  image,
  imageAlt = "Alternating block image",
  ctaText = "Learn More",
  ctaLink = "#",
  reverseLayout = false,
  backgroundColor = "bg-white",
  textColor = "text-gray-900",
  paddingTop = "lg",
  paddingBottom = "lg",
}) => {
  // Handle author data - can be single author or array
  const getAuthorData = (): AuthorData | null => {
    if (!author) return null;
    
    // Handle Builder.io reference object
    if (author && typeof author === 'object' && '@type' in author && author['@type'] === '@builder.io/core:Reference') {
      return author.value || null;
    }
    
    // Handle array of authors
    if (Array.isArray(author)) {
      const firstAuthor = author[0];
      // Check if it's a Builder.io reference
      if (firstAuthor && typeof firstAuthor === 'object' && '@type' in firstAuthor && firstAuthor['@type'] === '@builder.io/core:Reference') {
        return firstAuthor.value || null;
      }
      return firstAuthor || null;
    }
    
    // Handle direct author object
    return author;
  };

  const authorData = getAuthorData();
  
  const paddingTopClass = {
    sm: 'pt-8',
    md: 'pt-12',
    lg: 'pt-16',
    xl: 'pt-20',
    '2xl': 'pt-24',
  }[paddingTop];

  const paddingBottomClass = {
    sm: 'pb-8',
    md: 'pb-12',
    lg: 'pb-16',
    xl: 'pb-20',
    '2xl': 'pb-24',
  }[paddingBottom];

  return (
    <section className={`${backgroundColor} ${paddingTopClass} ${paddingBottomClass}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${
          reverseLayout ? 'lg:grid-flow-col-dense' : ''
        }`}>
          {/* Content Column */}
          <div className={`${reverseLayout ? 'lg:col-start-2' : ''}`}>
            <div className="space-y-6">
              {subtitle && (
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-wide">
                  {subtitle}
                </p>
              )}
              
              <h2 className={`text-3xl sm:text-4xl font-bold ${textColor} leading-tight`}>
                {title}
              </h2>
              
              <p className={`text-lg ${textColor} opacity-90 leading-relaxed`}>
                {description}
              </p>

              {/* Author Section */}
              {authorData && (
                <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
                  {authorData.avatar && (
                    <img
                      src={authorData.avatar}
                      alt={authorData.imageAltText || authorData.authorName || "Author"}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    {authorData.authorName && (
                      <p className={`font-semibold ${textColor}`}>
                        {authorData.authorName}
                      </p>
                    )}
                    {authorData.jobTitle && (
                      <p className={`text-sm ${textColor} opacity-75`}>
                        {authorData.jobTitle}
                      </p>
                    )}
                    {authorData.nationality && (
                      <p className={`text-xs ${textColor} opacity-60`}>
                        {authorData.nationality}
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {ctaText && ctaLink && (
                <div className="pt-4">
                  <a
                    href={ctaLink}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {ctaText}
                    <svg
                      className="ml-2 -mr-1 w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Image Column */}
          <div className={`${reverseLayout ? 'lg:col-start-1' : ''}`}>
            <div className="relative">
              {image ? (
                <img
                  src={image}
                  alt={imageAlt}
                  className="w-full h-64 sm:h-80 lg:h-96 object-cover rounded-lg shadow-lg"
                />
              ) : (
                <div className="w-full h-64 sm:h-80 lg:h-96 bg-gray-200 rounded-lg shadow-lg flex items-center justify-center">
                  <svg
                    className="w-24 h-24 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
              
              {/* Optional decorative element */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-blue-100 rounded-full opacity-20"></div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-200 rounded-full opacity-30"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AlternatingBlock;
