// src/components/admin/testimonials/TestimonialEditor.tsx
'use client';

import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useErrorMessage } from '@/lib/useErrorMessage';
import { TestimonialForm } from './TestimonialForm';
import { useTestimonials } from './testimonialsQuery';

/** Fiche d'un témoignage. Sans `testimonialId`, c'est la création. */
export function TestimonialEditor({ testimonialId }: { testimonialId?: string }) {
  const t = useTranslations('admin.testimonials');
  const errorMessage = useErrorMessage();
  const testimonialsQuery = useTestimonials();

  if (!testimonialId) return <TestimonialForm />;

  if (testimonialsQuery.isLoading) {
    return <p className="text-sm text-[var(--color-muted)] text-center py-6">{t('loading')}</p>;
  }
  if (testimonialsQuery.isError) {
    return (
      <p className="text-sm text-[var(--color-secondary)] text-center py-6">{errorMessage(testimonialsQuery.error)}</p>
    );
  }

  const testimonial = testimonialsQuery.data?.find((item) => item.id === testimonialId);
  if (!testimonial) notFound();

  // `key` : repart de valeurs neuves si l'on passe d'un témoignage à un autre sans démonter la page.
  return <TestimonialForm key={testimonial.id} testimonial={testimonial} />;
}
