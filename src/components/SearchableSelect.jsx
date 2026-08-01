'use client';

import { useId, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export default function SearchableSelect({ value, onChange, options, placeholder = 'Selecione...', searchPlaceholder = 'Buscar...' }) {
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selectedOption = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) => normalizeText(option.label).includes(normalizeText(search)));

  function selectOption(optionValue) {
    onChange(optionValue);
    setSearch('');
    setIsOpen(false);
  }

  return (
    <div
      className="relative mt-1"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
          setSearch('');
        }
      }}
    >
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-controls={listId}
        onClick={() => setIsOpen((open) => !open)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left text-sm outline-none transition-colors focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
      >
        <span className={selectedOption ? 'truncate text-slate-800' : 'truncate text-slate-400'}>{selectedOption?.label || placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input autoFocus type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400" />
            </div>
          </div>
          <div id={listId} role="listbox" className="max-h-56 overflow-y-auto p-1.5">
            {filteredOptions.length > 0 ? filteredOptions.map((option) => {
              const selected = String(option.value) === String(value);
              return (
                <button key={option.value} type="button" role="option" aria-selected={selected} onClick={() => selectOption(option.value)} className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${selected ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                  <span className="truncate">{option.label}</span>
                  {selected && <Check className="h-4 w-4 shrink-0" />}
                </button>
              );
            }) : <p className="px-3 py-6 text-center text-sm text-slate-400">Nenhum resultado encontrado.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
