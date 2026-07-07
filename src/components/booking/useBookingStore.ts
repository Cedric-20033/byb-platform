// src/components/booking/useBookingStore.ts
import { create } from 'zustand';
import type { Service, SubService } from '@/types';
import type { SlotDTO } from '@/app/actions/booking/getAvailableSlots';

export type BookingStep = 'service' | 'subService' | 'slot' | 'confirmation';

export type ClientInfo = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

type BookingState = {
  step: BookingStep;
  selectedService: Service | null;
  selectedSubService: SubService | null;
  selectedSlot: SlotDTO | null;
  clientInfo: ClientInfo;

  setStep: (step: BookingStep) => void;
  selectService: (service: Service) => void;
  selectSubService: (subService: SubService | null) => void;
  selectSlot: (slot: SlotDTO) => void;
  setClientInfo: (info: Partial<ClientInfo>) => void;
  reset: () => void;
};

const initialClientInfo: ClientInfo = { name: '', email: '', phone: '', notes: '' };

/**
 * État UI pur du wizard de réservation. Ce store ne contient AUCUNE règle
 * métier (pas de validation de créneau, pas d'appel réseau) — uniquement
 * la progression et les choix de l'utilisateur. La logique de soumission
 * vit dans ConfirmationStep, qui appelle le Server Action approprié.
 */
export const useBookingStore = create<BookingState>((set) => ({
  step: 'service',
  selectedService: null,
  selectedSubService: null,
  selectedSlot: null,
  clientInfo: initialClientInfo,

  setStep: (step) => set({ step }),
  selectService: (service) => set({ selectedService: service, selectedSubService: null }),
  selectSubService: (subService) => set({ selectedSubService: subService }),
  selectSlot: (slot) => set({ selectedSlot: slot }),
  setClientInfo: (info) => set((state) => ({ clientInfo: { ...state.clientInfo, ...info } })),
  reset: () =>
    set({
      step: 'service',
      selectedService: null,
      selectedSubService: null,
      selectedSlot: null,
      clientInfo: initialClientInfo,
    }),
}));
