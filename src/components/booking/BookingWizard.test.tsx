// @vitest-environment jsdom
// src/components/booking/BookingWizard.test.tsx
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextIntlClientProvider } from 'next-intl';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildService, buildSubService } from '@/test/fixtures/catalog';
import { BookingWizard } from './BookingWizard';
import { useBookingStore } from './useBookingStore';

// Les Server Actions touchent Supabase : on ne teste ici que l'aiguillage des étapes.
vi.mock('@/app/actions/booking/getAvailableSlots', () => ({
  getAvailableSlotsAction: vi.fn().mockResolvedValue({ success: true, slots: [] }),
}));
vi.mock('@/app/actions/booking/createAppointment', () => ({
  createAppointmentAction: vi.fn(),
}));

const messages = JSON.parse(readFileSync(join(process.cwd(), 'messages', 'fr.json'), 'utf8'));
const copy = messages.booking;

const toiture = buildService('toiture', [buildSubService('plate'), buildSubService('pentue')]);
const carrelage = buildService('carrelage');
const services = [toiture, carrelage];

function renderWizard(props: Partial<React.ComponentProps<typeof BookingWizard>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <BookingWizard services={services} {...props} />
    </NextIntlClientProvider>,
  );
}

const heading = (name: string) => screen.queryByRole('heading', { name });

describe('BookingWizard : présélection', () => {
  it('démarre par le choix du service sans présélection', () => {
    renderWizard();

    expect(heading(copy.service.title)).toBeTruthy();
  });

  it('ouvre le choix de sous-prestation quand le service en possède', () => {
    renderWizard({ initialService: toiture });

    expect(heading(copy.subService.title)).toBeTruthy();
    expect(useBookingStore.getState().selectedService?.id).toBe(toiture.id);
  });

  it('saute directement au créneau quand le service n\'a pas de sous-prestation', async () => {
    renderWizard({ initialService: carrelage });

    expect(heading(copy.slot.title)).toBeTruthy();
    expect(heading(copy.subService.title)).toBeNull();
    await screen.findByText(copy.slot.noSlots);
  });

  it('saute au créneau avec la sous-prestation présélectionnée', async () => {
    renderWizard({ initialService: toiture, initialSubService: toiture.subServices[1] });

    expect(heading(copy.slot.title)).toBeTruthy();
    expect(heading(copy.subService.title)).toBeNull();
    expect(useBookingStore.getState().selectedSubService?.slug).toBe('pentue');
    await screen.findByText(copy.slot.noSlots);
  });

  it('remet le store à zéro au démontage', () => {
    const { unmount } = renderWizard({ initialService: toiture });
    expect(useBookingStore.getState().selectedService).not.toBeNull();

    unmount();

    expect(useBookingStore.getState().selectedService).toBeNull();
    expect(useBookingStore.getState().step).toBe('service');
  });
});
