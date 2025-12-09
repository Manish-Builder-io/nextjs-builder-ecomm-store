"use client";

import Link from 'next/link';
import React from 'react';

interface ExploreCollegesProps {
  heading?: string;
  searchPlaceholder?: string;
  searchAction?: string;
  filterLabel?: string;
  submitButtonText?: string;
  viewAllLinkText?: string;
  viewAllLinkHref?: string;
  backgroundColor?: string;
}

export default function ExploreColleges({
  heading = "Explore more than 1,000 colleges on Common App",
  searchPlaceholder = "Enter college name",
  searchAction = "/explore-college",
  filterLabel = "Accepts first year application",
  submitButtonText = "Start",
  viewAllLinkText = "Or view all colleges",
  viewAllLinkHref = "/explore-college",
  backgroundColor = "#5ACCCB",
}: ExploreCollegesProps): JSX.Element {
  const bgColorStyle = backgroundColor.startsWith('#') || backgroundColor.startsWith('rgb') 
    ? { backgroundColor } 
    : {};

  const bgColorClass = backgroundColor.startsWith('#') || backgroundColor.startsWith('rgb')
    ? ''
    : backgroundColor;

  return (
    <div 
      className={`px-14 py-10 max-w-7xl mx-auto w-full ${bgColorClass}`}
      style={bgColorStyle}
    >
      <h2 className='mb-5'>{heading}</h2>
      <form role='search' method='get' action={searchAction}>
        <fieldset>
          <legend className='sr-only'>Search Colleges</legend>
          <input name="q" className='rounded-full h-10 w-full px-5 py-2' placeholder={searchPlaceholder} />
        </fieldset>
        <fieldset className='mt-5'>
          <legend>Search by filter (optional)</legend>
          <div className="mt-3">
            <input 
              type="checkbox" 
              id="accepts_first_year" 
              name="category" 
              value="accepts_first_year" 
              className="sr-only peer"
            />
            <label 
              htmlFor="accepts_first_year"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/30 text-sm text-black cursor-pointer transition-colors duration-150 hover:bg-white/20 peer-checked:bg-black/30 peer-checked:text-white"
            >
              {filterLabel}
            </label>
            <div className='mt-5 flex gap-3'>
              <button className='bg-black text-white rounded-full px-5 py-2' type="submit">{submitButtonText}</button>
              <Link className="underline self-center" href={viewAllLinkHref}>{viewAllLinkText}</Link>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

