import { Product, ShopState } from "../types";
import { optimizeImageUrl } from "../utils/imageOptimizer";
import { calculateRelevance, normalizeText } from "../utils/storefrontHelpers";

interface HeaderSearchSuggestionsProps {
  store: ShopState;
  tempSearchQuery: string;
  onSelectCategory: (categoryId: string, subcategoryId: string) => void;
  onOpenProduct: (p: Product) => void;
  onViewAllResults: () => void;
}

export default function HeaderSearchSuggestions({
  store,
  tempSearchQuery,
  onSelectCategory,
  onOpenProduct,
  onViewAllResults
}: HeaderSearchSuggestionsProps) {
  const normQ = normalizeText(tempSearchQuery);

  const matchingCats = (store.dbCategories || []).filter(
    (c) => c.active !== false && normalizeText(c.nombre).includes(normQ)
  );

  const matchingSubs = (store.dbSubcategories || []).filter(
    (s) => s.active !== false && normalizeText(s.nombre).includes(normQ)
  );

  const matchingProds = store.products
    .filter((p) => !p.paused && p.active !== false)
    .map((p) => ({
      product: p,
      score: calculateRelevance(p, tempSearchQuery, store.dbCategories, store.dbSubcategories)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const hasAnySuggestion = matchingCats.length > 0 || matchingSubs.length > 0 || matchingProds.length > 0;
  const totalMatches = store.products.filter(
    (p) =>
      !p.paused &&
      p.active !== false &&
      calculateRelevance(p, tempSearchQuery, store.dbCategories, store.dbSubcategories) > 0
  ).length;

  return (
    <div className="absolute right-0 top-full mt-2 bg-[#0B1730]/95 border border-[#D4A55A]/30 backdrop-blur-md rounded-xl shadow-2xl z-55 overflow-hidden divide-y divide-[#D4A55A]/10 w-[280px] sm:w-[320px] md:w-[360px] animate-fade-in">
      {!hasAnySuggestion ? (
        <div className="p-4 text-center">
          <p className="text-xs text-zinc-400">No hay sugerencias para "{tempSearchQuery}"</p>
        </div>
      ) : (
        <>
          {(matchingCats.length > 0 || matchingSubs.length > 0) && (
            <div className="p-2 bg-[#0B1730]/50">
              <span className="block text-[9px] font-extrabold uppercase text-[#E6BF76]/60 px-2 py-0.5 tracking-wider">
                Categorías sugeridas
              </span>
              <div className="space-y-0.5 mt-1">
                {matchingCats.map((cat) => (
                  <button
                    key={`header-cat-sug-${cat.id}`}
                    onClick={() => onSelectCategory(cat.id, "all")}
                    className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#D4A55A]/10 text-[#F4EAD7] hover:text-[#E6BF76] transition-colors flex items-center justify-between cursor-pointer border-0 bg-transparent"
                  >
                    <span className="font-semibold">{cat.nombre}</span>
                    <span className="text-[9px] text-[#E6BF76]/70">Ver ›</span>
                  </button>
                ))}
                {matchingSubs.map((sub) => {
                  const parentCat = (store.dbCategories || []).find((c) => c.id === sub.categoria_id);
                  return (
                    <button
                      key={`header-sub-sug-${sub.id}`}
                      onClick={() => onSelectCategory(parentCat ? parentCat.id : "todos", sub.id)}
                      className="w-full text-left px-2 py-1 rounded text-xs hover:bg-[#D4A55A]/10 text-[#F4EAD7] hover:text-[#E6BF76] transition-colors flex items-center justify-between cursor-pointer border-0 bg-transparent"
                    >
                      <span>
                        {parentCat?.nombre || "Otros"} › <span className="font-semibold text-[#E6BF76]">{sub.nombre}</span>
                      </span>
                      <span className="text-[9px] text-[#E6BF76]/70">Ver ›</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {matchingProds.length > 0 && (
            <div className="p-2">
              <span className="block text-[9px] font-extrabold uppercase text-[#E6BF76]/60 px-2 py-0.5 tracking-wider">
                Artículos sugeridos
              </span>
              <div className="space-y-1 mt-1">
                {matchingProds.map((item) => {
                  const p = item.product;
                  return (
                    <button
                      key={`header-prod-sug-${p.id}`}
                      onClick={() => onOpenProduct(p)}
                      className="w-full text-left p-1 rounded hover:bg-[#D4A55A]/10 transition-colors flex items-center gap-2 cursor-pointer group border-0 bg-transparent"
                    >
                      <div className="w-8 h-8 rounded overflow-hidden bg-[#050B1A] shrink-0 border border-[#D4A55A]/25">
                        <img
                          src={optimizeImageUrl(p.imageUrl, 64, "auto")}
                          width="32"
                          height="32"
                          loading="lazy"
                          decoding="async"
                          alt={p.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-[11px] font-bold text-[#F4EAD7] truncate group-hover:text-[#E6BF76] transition-colors">
                          {p.name}
                        </span>
                        <span className="block text-[9px] text-zinc-400 truncate">
                          {p.category} | {p.stock > 0 ? `${p.stock} dispo` : "Bajo demanda"}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black text-[#E6BF76]">${Math.round(p.price)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-1 px-2 flex justify-between bg-[#0B1730] text-[9px] text-[#E6BF76]/80">
            <span>Sugerido</span>
            <button
              onClick={onViewAllResults}
              className="hover:underline font-bold bg-transparent border-0 cursor-pointer text-[#E6BF76]"
            >
              Ver todos ({totalMatches})
            </button>
          </div>
        </>
      )}
    </div>
  );
}
