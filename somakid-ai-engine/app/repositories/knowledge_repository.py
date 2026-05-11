"""
SOMAKID AI Engine - Knowledge Repository
Manages access to the species knowledge base and educational content.
Provides catalog data and species information for the Biodiversity Explorer.
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any, List

from ..core.logging_config import get_logger, log_error

logger = get_logger(__name__)


# =============================================================================
# Default Knowledge Base
# =============================================================================

DEFAULT_CATALOG = {
    "fr": [
        {
            "id": "mountain_gorilla",
            "name": "Gorilla des montagnes",
            "scientific_name": "Gorilla beringei beringei",
            "category": "animal",
            "region": "Central Africa",
            "conservation_status": "Critically Endangered",
            "emoji": "🦍",
            "description": "The mountain gorilla lives in the cloud forests of Central Africa. It is one of our closest relatives in the animal kingdom.",
            "ecological_role": "Forest gardener - disperses seeds and maintains forest health.",
            "color": "#2D5016",
        },
        {
            "id": "baobab",
            "name": "Baobab",
            "scientific_name": "Adansonia digitata",
            "category": "plant",
            "region": "Sub-Saharan Africa",
            "conservation_status": "Vulnerable",
            "emoji": "🌳",
            "description": "The African tree of life can live for thousands of years. It stores water in its trunk to survive droughts.",
            "ecological_role": "Water reservoir, shelter for hundreds of species.",
            "color": "#8B4513",
        },
        {
            "id": "african_elephant",
            "name": "African Elephant",
            "scientific_name": "Loxodonta africana",
            "category": "animal",
            "region": "Africa",
            "conservation_status": "Vulnerable",
            "emoji": "🐘",
            "description": "The largest land animal on Earth. Elephants are ecosystem engineers that shape the African landscape.",
            "ecological_role": "Creates forest corridors, spreads seeds across vast distances.",
            "color": "#708090",
        },
        {
            "id": "grey_parrot",
            "name": "African Grey Parrot",
            "scientific_name": "Psittacus erithacus",
            "category": "animal",
            "region": "Central Africa",
            "conservation_status": "Endangered",
            "emoji": "🦜",
            "description": "The most intelligent bird in Africa. Grey parrots can learn hundreds of words and solve complex problems.",
            "ecological_role": "Pollinator and seed disperser in tropical forests.",
            "color": "#B0C4DE",
        },
        {
            "id": "cassava",
            "name": "Cassava",
            "scientific_name": "Manihot esculenta",
            "category": "plant",
            "region": "Tropical Africa",
            "conservation_status": "Stable",
            "emoji": "🌿",
            "description": "A staple food for millions of Africans. Cassava is drought-resistant and grows in poor soils.",
            "ecological_role": "Protects soils from erosion, provides food security.",
            "color": "#228B22",
        },
        {
            "id": "okapi",
            "name": "Okapi",
            "scientific_name": "Okapia johnstoni",
            "category": "animal",
            "region": "Democratic Republic of Congo",
            "conservation_status": "Endangered",
            "emoji": "🦒",
            "description": "A rare forest giraffe found only in the Congo rainforest. It has striped legs like a zebra.",
            "ecological_role": "Forest browser that helps maintain undergrowth diversity.",
            "color": "#8B4513",
        },
        {
            "id": "mango_tree",
            "name": "Mango Tree",
            "scientific_name": "Mangifera indica",
            "category": "plant",
            "region": "Tropical Africa",
            "conservation_status": "Stable",
            "emoji": "🥭",
            "description": "Provides delicious fruits and shade. Mango trees can grow very large and live for over 100 years.",
            "ecological_role": "Provides food and habitat for birds, insects, and small mammals.",
            "color": "#FF8C00",
        },
        {
            "id": "chimpanzee",
            "name": "Chimpanzee",
            "scientific_name": "Pan troglodytes",
            "category": "animal",
            "region": "Central and West Africa",
            "conservation_status": "Endangered",
            "emoji": "🐵",
            "description": "Our closest living relative. Chimpanzees use tools, live in communities, and have complex social behaviors.",
            "ecological_role": "Key seed disperser in tropical forests.",
            "color": "#4A3728",
        },
        {
            "id": "acacia",
            "name": "Acacia Tree",
            "scientific_name": "Acacia senegal",
            "category": "plant",
            "region": "Sahel and East Africa",
            "conservation_status": "Stable",
            "emoji": "🌳",
            "description": "An iconic African tree that provides gum arabic. Acacias have thorns to protect themselves from herbivores.",
            "ecological_role": "Fixes nitrogen in soil, provides food for giraffes and insects.",
            "color": "#C4A35A",
        },
        {
            "id": "hippopotamus",
            "name": "Hippopotamus",
            "scientific_name": "Hippopotamus amphibius",
            "category": "animal",
            "region": "Sub-Saharan Africa",
            "conservation_status": "Vulnerable",
            "emoji": "🦛",
            "description": "Spends most of the day in water to stay cool. Hippos are essential for river ecosystems.",
            "ecological_role": "Creates channels in waterways, fertilizes aquatic plants.",
            "color": "#8B8682",
        },
    ],
    "ln": [
        {
            "id": "mountain_gorilla",
            "name": "Gorille ya bangomba",
            "category": "animal",
            "region": "Afrique centrale",
            "conservation_status": "En danger critique",
            "emoji": "🦍",
            "description": "Gorille ya bangomba evandaka na zamba ya mbula mingi ya Afrique centrale.",
            "ecological_role": "Mosali ya elanga ya zamba - epanzaka bankona mpe ebatelaka sante ya zamba.",
            "color": "#2D5016",
        },
        {
            "id": "baobab",
            "name": "Baobab",
            "category": "plant",
            "region": "Afrique sub-saharienne",
            "conservation_status": "Vulnerable",
            "emoji": "🌳",
            "description": "Nzete ya bomoi ya Afrika ekoki kowumela bankama ya mibu.",
            "ecological_role": "Ebombaka mayi, efandelo pona banyama ebele.",
            "color": "#8B4513",
        },
        {
            "id": "african_elephant",
            "name": "Nzoku ya Afrika",
            "category": "animal",
            "region": "Afrika",
            "conservation_status": "Vulnerable",
            "emoji": "🐘",
            "description": "Nyama ya mokili oyo eleki monene. Nzoku esalaka ete zamba ezala na nzela.",
            "ecological_role": "Etongaka ba nzela na zamba, epanzaka bankona.",
            "color": "#708090",
        },
    ],
    "sw": [
        {
            "id": "mountain_gorilla",
            "name": "Sokwe wa Milimani",
            "category": "animal",
            "region": "Afrika ya Kati",
            "conservation_status": "Hatarini Kutoweka",
            "emoji": "🦍",
            "description": "Sokwe wa milimani anaishi katika misitu ya mawingu ya Afrika ya Kati.",
            "ecological_role": "Mtunza bustani wa msitu - anasambaza mbegu na kudumisha afya ya msitu.",
            "color": "#2D5016",
        },
        {
            "id": "baobab",
            "name": "Mbuyu",
            "category": "plant",
            "region": "Afrika ya Kusini mwa Jangwa la Sahara",
            "conservation_status": "Hatarini",
            "emoji": "🌳",
            "description": "Mti wa maisha wa Afrika unaweza kuishi kwa maelfu ya miaka.",
            "ecological_role": "Hifadhi ya maji, makazi kwa mamia ya spishi.",
            "color": "#8B4513",
        },
        {
            "id": "african_elephant",
            "name": "Tembo wa Afrika",
            "category": "animal",
            "region": "Afrika",
            "conservation_status": "Hatarini",
            "emoji": "🐘",
            "description": "Mnyama mkubwa zaidi wa nchi kavu duniani. Tembo ni wahandisi wa mfumo wa ikolojia.",
            "ecological_role": "Inaunda korido za misitu, inasambaza mbegu.",
            "color": "#708090",
        },
    ],
}


# =============================================================================
# Knowledge Repository
# =============================================================================

class KnowledgeRepository:
    """
    Repository for accessing the species knowledge base.
    Provides educational content about African flora and fauna.
    """

    def __init__(self, data_dir: Path):
        """
        Initialize the knowledge repository.

        Args:
            data_dir: Path to the knowledge data directory.
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self._catalog = self._load_catalog()
        logger.info("knowledge_repository_initialized", data_dir=str(self.data_dir))

    # =========================================================================
    # Catalog Methods
    # =========================================================================

    def get_catalog(
        self,
        category: Optional[str] = None,
        language: str = "fr",
    ) -> List[Dict[str, Any]]:
        """
        Get the species catalog, optionally filtered by category.

        Args:
            category: Filter by species category (plant, animal, insect, fungus).
            language: Language for the catalog entries.

        Returns:
            List of catalog entries.
        """
        catalog = self._catalog.get(language, self._catalog.get("fr", []))

        if category:
            catalog = [
                entry for entry in catalog
                if entry.get("category") == category
            ]

        return catalog

    def get_species(
        self,
        species_id: str,
        language: str = "fr",
    ) -> Optional[Dict[str, Any]]:
        """
        Get detailed information about a specific species.

        Args:
            species_id: Species unique identifier.
            language: Language for the details.

        Returns:
            Species data dictionary or None if not found.
        """
        catalog = self._catalog.get(language, self._catalog.get("fr", []))

        for entry in catalog:
            if entry.get("id") == species_id:
                return entry

        return None

    def search_species(
        self,
        query: str,
        language: str = "fr",
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """
        Search for species by name or description.

        Args:
            query: Search query string.
            language: Language to search in.
            limit: Maximum number of results.

        Returns:
            List of matching species entries.
        """
        query_lower = query.lower()
        catalog = self._catalog.get(language, self._catalog.get("fr", []))
        results = []

        for entry in catalog:
            name = entry.get("name", "").lower()
            description = entry.get("description", "").lower()
            scientific = entry.get("scientific_name", "").lower()

            if query_lower in name or query_lower in description or query_lower in scientific:
                results.append(entry)

            if len(results) >= limit:
                break

        return results

    def get_categories(self, language: str = "fr") -> List[Dict[str, str]]:
        """
        Get all available species categories.

        Args:
            language: Language for category names.

        Returns:
            List of category definitions.
        """
        categories = {
            "fr": [
                {"id": "plant", "name": "Plantes", "emoji": "🌿"},
                {"id": "animal", "name": "Animaux", "emoji": "🦁"},
                {"id": "insect", "name": "Insectes", "emoji": "🐝"},
                {"id": "fungus", "name": "Champignons", "emoji": "🍄"},
                {"id": "other", "name": "Autres", "emoji": "🌍"},
            ],
            "ln": [
                {"id": "plant", "name": "Banzete", "emoji": "🌿"},
                {"id": "animal", "name": "Banyama", "emoji": "🦁"},
                {"id": "insect", "name": "Banyama mike", "emoji": "🐝"},
                {"id": "fungus", "name": "Champignons", "emoji": "🍄"},
                {"id": "other", "name": "Basusu", "emoji": "🌍"},
            ],
            "sw": [
                {"id": "plant", "name": "Mimea", "emoji": "🌿"},
                {"id": "animal", "name": "Wanyama", "emoji": "🦁"},
                {"id": "insect", "name": "Wadudu", "emoji": "🐝"},
                {"id": "fungus", "name": "Uyoga", "emoji": "🍄"},
                {"id": "other", "name": "Nyingine", "emoji": "🌍"},
            ],
        }

        return categories.get(language, categories["fr"])

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get knowledge base statistics.

        Returns:
            Statistics about the catalog content.
        """
        all_entries = self._catalog.get("fr", [])
        categories = {}
        regions = set()

        for entry in all_entries:
            cat = entry.get("category", "other")
            categories[cat] = categories.get(cat, 0) + 1

            region = entry.get("region", "")
            if region:
                regions.add(region)

        return {
            "total_species": len(all_entries),
            "categories": categories,
            "regions": len(regions),
            "languages_available": list(self._catalog.keys()),
        }

    # =========================================================================
    # Private Methods
    # =========================================================================

    def _load_catalog(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Load the species catalog from disk or use defaults.

        Returns:
            Catalog dictionary keyed by language.
        """
        catalog_file = self.data_dir / "catalog.json"

        if catalog_file.exists():
            try:
                with open(catalog_file, "r", encoding="utf-8") as f:
                    catalog = json.load(f)
                logger.info("catalog_loaded_from_file", entries=self._count_entries(catalog))
                return catalog
            except Exception as e:
                log_error(logger, "Failed to load catalog file, using defaults", exception=e)

        # Use default catalog
        logger.info("using_default_catalog", entries=self._count_entries(DEFAULT_CATALOG))
        return DEFAULT_CATALOG

    def _count_entries(self, catalog: Dict[str, List[Dict[str, Any]]]) -> int:
        """Count total entries in catalog."""
        return sum(len(entries) for entries in catalog.values())

    def health_check(self) -> bool:
        """
        Check if the knowledge repository is operational.

        Returns:
            True if the repository is healthy.
        """
        try:
            catalog = self.get_catalog(language="fr")
            return len(catalog) > 0
        except Exception:
            return False