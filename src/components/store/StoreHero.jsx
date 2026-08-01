'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

const DEFAULT_BANNER = {
  id: 'default',
  imagem_desktop: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=2070&auto=format&fit=crop',
  imagem_mobile: '',
  titulo: 'Movimento e Estilo para o seu Bem-estar',
  subtitulo: 'Descubra nossa nova coleção focada em conforto, durabilidade e alta performance.',
  link_tipo: 'section',
  link_valor: 'produtos',
};

export default function StoreHero({ banners, primaryColor, onCategoryChange }) {
  const router = useRouter();
  const slides = banners?.length ? banners : [DEFAULT_BANNER];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return undefined;

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [slides.length]);

  const activeSlide = slides[activeIndex] || slides[0];

  function goToSlide(index) {
    setActiveIndex((index + slides.length) % slides.length);
  }

  function handleLearnMore() {
    if (activeSlide.link_tipo === 'product' && activeSlide.link_valor) {
      router.push(`/produto/${activeSlide.link_valor}`);
      return;
    }

    if (activeSlide.link_tipo === 'category' && activeSlide.link_valor) {
      onCategoryChange?.(activeSlide.link_valor);
      document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (activeSlide.link_tipo === 'section') {
      const sectionId = activeSlide.link_valor === 'topo' ? 'topo' : 'produtos';
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }
  }

  const hasLink = activeSlide.link_tipo && activeSlide.link_tipo !== 'none';

  return (
    <section id="topo" className="group relative flex h-[68svh] min-h-[480px] w-full items-center justify-center overflow-hidden bg-slate-200 md:h-[min(72vh,780px)]">
      {slides.map((slide, index) => (
        <picture key={slide.id || index} className={`absolute inset-0 transition-opacity duration-700 ${index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'}`}>
          {slide.imagem_mobile && <source media="(max-width: 767px)" srcSet={slide.imagem_mobile} />}
          <img src={slide.imagem_desktop} alt={slide.titulo || `Banner ${index + 1}`} className="h-full w-full object-cover" />
        </picture>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/15" />

      <div key={activeSlide.id || activeIndex} className="relative z-10 mx-auto max-w-4xl px-5 text-center text-white animate-in fade-in slide-in-from-bottom-4 duration-700 sm:px-8">
        {activeSlide.titulo && <h1 className="text-4xl font-bold tracking-tight drop-shadow-lg sm:text-5xl lg:text-6xl">{activeSlide.titulo}</h1>}
        {activeSlide.subtitulo && <p className="mx-auto mt-4 max-w-2xl text-base font-medium text-white/90 drop-shadow-md sm:text-xl">{activeSlide.subtitulo}</p>}
        {hasLink && (
          <button type="button" onClick={handleLearnMore} style={{ color: primaryColor }} className="mt-7 rounded-full bg-white px-7 py-3 text-sm font-bold tracking-wide shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl md:translate-y-3 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
            SAIBA MAIS
          </button>
        )}
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" onClick={() => goToSlide(activeIndex - 1)} aria-label="Slide anterior" className="absolute left-3 z-20 rounded-full bg-black/25 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/45 sm:left-6"><ChevronLeft className="h-6 w-6" /></button>
          <button type="button" onClick={() => goToSlide(activeIndex + 1)} aria-label="Próximo slide" className="absolute right-3 z-20 rounded-full bg-black/25 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/45 sm:right-6"><ChevronRight className="h-6 w-6" /></button>
          <div className="absolute bottom-5 z-20 flex gap-2">
            {slides.map((slide, index) => <button key={slide.id || index} type="button" onClick={() => goToSlide(index)} aria-label={`Ir para slide ${index + 1}`} className={`h-2 rounded-full bg-white transition-all ${index === activeIndex ? 'w-7 opacity-100' : 'w-2 opacity-55'}`} />)}
          </div>
        </>
      )}
    </section>
  );
}
