import {
  Watch,
  Percent,
  Palette,
  Tag,
  Coffee,
  Gamepad2,
  Wrench,
  Crown,
  Heart,
  Footprints,
  BookOpen,
  Scissors,
  Gem,
  Flame,
  Lightbulb,
  Printer,
  Music,
  Dumbbell,
  Glasses,
  Baby,
  Wine,
  Tv,
  HardDrive,
  Headphones,
  Sofa,
  Cpu,
  Box
} from "lucide-react";

export default function ExtraCategoryIcon({ name }: { name: string }) {
  const cat = (name || "").toLowerCase();

  if (cat === "watch" || cat === "relojes") return <Watch className="h-5 w-5" />;
  if (cat === "percent" || cat === "descuentos") return <Percent className="h-5 w-5" />;
  if (cat === "palette" || cat === "diseno") return <Palette className="h-5 w-5" />;
  if (cat === "tag" || cat === "promos" || cat === "etiqueta") return <Tag className="h-5 w-5" />;
  if (cat === "coffee" || cat === "mate") return <Coffee className="h-5 w-5" />;
  if (cat === "gamepad2" || cat === "gaming") return <Gamepad2 className="h-5 w-5" />;
  if (cat === "wrench" || cat === "herramientas") return <Wrench className="h-5 w-5" />;
  if (cat === "crown" || cat === "premium") return <Crown className="h-5 w-5" />;
  if (cat === "heart" || cat === "favoritos") return <Heart className="h-5 w-5" />;
  if (cat === "footprints" || cat === "calzado" || cat === "zapatillas" || cat === "zapatos") return <Footprints className="h-5 w-5" />;
  if (cat === "bookopen" || cat === "libreria" || cat === "libros" || cat === "agenda") return <BookOpen className="h-5 w-5" />;
  if (cat === "scissors" || cat === "manualidades" || cat === "costura") return <Scissors className="h-5 w-5" />;
  if (cat === "gem" || cat === "joyas" || cat === "joyeria" || cat === "accesorios") return <Gem className="h-5 w-5" />;
  if (cat === "flame" || cat === "hot" || cat === "tendencia") return <Flame className="h-5 w-5" />;
  if (cat === "lightbulb" || cat === "iluminacion" || cat === "lamparas") return <Lightbulb className="h-5 w-5" />;
  if (cat === "printer" || cat === "impresora" || cat === "impresiones") return <Printer className="h-5 w-5" />;
  if (cat === "music" || cat === "musica") return <Music className="h-5 w-5" />;
  if (cat === "dumbbell" || cat === "deportes" || cat === "deporte" || cat === "fitness") return <Dumbbell className="h-5 w-5" />;
  if (cat === "glasses" || cat === "lentes" || cat === "gafas") return <Glasses className="h-5 w-5" />;
  if (cat === "baby" || cat === "bebe" || cat === "bebes") return <Baby className="h-5 w-5" />;
  if (cat === "wine" || cat === "bazar" || cat === "copas" || cat === "vajilla") return <Wine className="h-5 w-5" />;
  if (cat === "tv" || cat === "televisores" || cat === "pantallas") return <Tv className="h-5 w-5" />;
  if (cat === "harddrive" || cat === "discos" || cat === "almacenamiento") return <HardDrive className="h-5 w-5" />;
  if (cat === "headphones" || cat === "auriculares") return <Headphones className="h-5 w-5" />;
  if (cat === "sofa" || cat === "muebles" || cat === "deco" || cat === "decoracion") return <Sofa className="h-5 w-5" />;
  if (cat === "cpu" || cat === "computacion" || cat === "hardware") return <Cpu className="h-5 w-5" />;

  if (cat.includes("impresio") || cat.includes("3d") || cat.includes("filamento") || cat.includes("pla") || cat.includes("llaver")) {
    return <Printer className="h-5 w-5" />;
  }
  if (cat.includes("calza") || cat.includes("zapat") || cat.includes("bota") || cat.includes("sandalia") || cat.includes("foot")) {
    return <Footprints className="h-5 w-5" />;
  }
  if (cat.includes("bazar") || cat.includes("cocina") || cat.includes("mate") || cat.includes("cafe") || cat.includes("taza") || cat.includes("termo") || cat.includes("vaso") || cat.includes("copa") || cat.includes("vajilla") || cat.includes("wine")) {
    return <Coffee className="h-5 w-5" />;
  }
  if (cat.includes("accesor") || cat.includes("joya") || cat.includes("reloj") || cat.includes("bols") || cat.includes("mochila") || cat.includes("cartera") || cat.includes("watch") || cat.includes("gem")) {
    return <Watch className="h-5 w-5" />;
  }
  if (cat.includes("game") || cat.includes("juego") || cat.includes("consola") || cat.includes("playstation") || cat.includes("xbox") || cat.includes("nintendo")) {
    return <Gamepad2 className="h-5 w-5" />;
  }
  if (cat.includes("oferta") || cat.includes("promoc") || cat.includes("descu") || cat.includes("liquid") || cat.includes("sale") || cat.includes("porcent")) {
    return <Percent className="h-5 w-5" />;
  }

  return <Box className="h-5 w-5" />;
}
