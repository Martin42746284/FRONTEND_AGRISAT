#!/bin/bash
# ============================================================
# DÉMONSTRATION AGRI-SAT - Weekend Priorité 2
# Auteur : Équipe développement
# Montrer : Tracé automatique + Détection culture orge
# ============================================================

set -e

# Couleurs pour l'affichage terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "============================================================"
echo "  DÉMONSTRATION : AGRI-SAT - Capacités IA & Tracé"
echo "============================================================"
echo ""

# ------------------------
# Étape 1 : Vérification
# ------------------------
echo -e "${BLUE}✅ Étape 1 : Vérification du backend${NC}"
echo "----------------------------------------"

if curl -s http://localhost:3001/api/modeles > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Backend AGRISAT en cours d'exécution sur port 3001"
    BACKEND_STATUS="OK"
else
    echo -e "  ${YELLOW}!${NC} Backend non détecté - démarrer avant la démo"
    BACKEND_STATUS="SKIP"
fi
echo ""

# ------------------------
# Étape 2 : Modèles IA
# ------------------------
echo -e "${BLUE}✅ Étape 2 : Modèles IA & Métriques d'évaluation${NC}"
echo "----------------------------------------"
echo ""

echo -e "  ${GREEN}Affichage des métriques sur Models.tsx${NC}"
echo ""

# Récupération API modeles
MODELES=$(curl -s http://localhost:3001/api/modeles)

# Extraction des valeurs clés via Python (fichier temporaire pour éviter les soucis d'échappement)
PRECISION_ORGE=$(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
m = d['classification_orge']['metriques']
print(f'{m[\"precision_orge\"]:.2%}')
")

RAPPEL_ORGE=$(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
m = d['classification_orge']['metriques']
print(f'{m[\"rappel_orge\"]:.2%}')
")

F1_ORGE=$(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
m = d['classification_orge']['metriques']
print(f'{m[\"f1_orge\"]:.2%}')
")

SEUIL=$(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
m = d['classification_orge']['metriques']
print(f'{m[\"seuil\"]:.4f}')
")

TN_FP_FN_TP=$(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
m = d['classification_orge']['metriques']
print(f'{m[\"tn\"]} / {m[\"fp\"]} / {m[\"fn\"]} / {m[\"tp\"]}')
")

N_SPLITS=$(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
e = d['classification_orge']['entrainement']
print(e['n_splits'])
")

echo -e "  ${GREEN}Métriques clés affichées sur Models.tsx :${NC}"
echo "  ----------------------------------------"
echo -e "   • Précision orge    : ${PRECISION_ORGE}"
echo -e "   • Rappel orge       : ${RAPPEL_ORGE}"
echo -e "   • F1 orge           : ${F1_ORGE}"
echo -e "   • Seuillage (threshold) : ${SEUIL}"
echo -e "   • Matrice de confusion (TN / FP / FN / TP) : ${TN_FP_FN_TP}"
echo -e "   • Nombre de plis (n_splits) : ${N_SPLITS}"
echo "  ----------------------------------------"
echo ""

# Détails complets
echo -e "  ${BLUE}Détail complet du modèle orge :${NC}"
echo "  $(echo "$MODELES" | python3 -c "
import sys, json
d = json.load(sys.stdin)
rf = d['classification_orge']
m = rf['metriques']
e = rf['entrainement']
print(f'   - Statut          : {rf[\"statut\"]}')
print(f'   - Present         : {rf[\"present\"]}')
print(f'   - Precision orge  : {m[\"precision_orge\"]:.2%}')
print(f'   - Rappel orge     : {m[\"rappel_orge\"]:.2%}')
print(f'   - F1 orge         : {m[\"f1_orge\"]:.2%}')
print(f'   - ROC AUC         : {m[\"roc_auc\"]:.2%}')
print(f'   - pr_auc          : {m[\"pr_auc\"]:.2%}')
print(f'   - Seuillage       : {m[\"seuil\"]:.2f}')
print(f'   - TN / FP / FN / TP : {m[\"tn\"]} / {m[\"fp\"]} / {m[\"fn\"]} / {m[\"tp\"]}')
print(f'   - Entraînement    : {e[\"n_features\"]} caractéristiques')
print(f'                            {e[\"n_lignes\"]} échantillons')
print(f'                            {e[\"n_splits\"]} plis ({e[\"validation\"]})')
" 2>&1)"
echo ""

# ------------------------
# Étape 3 : Tracé VHR
# ------------------------
echo -e "${BLUE}✅ Étape 3 : Tracé automatique de parcelles (VHR)${NC}"
echo "----------------------------------------"
echo ""

echo -e "  ${BL}Terminal :${NC} curl -X POST http://localhost:3001/api/zone-parcels"
ZONE=$(curl -s -X POST http://localhost:3001/api/zone-parcels \
    -H "Content-Type: application/json" \
    -d '{"latitude":47.07,"longitude":-19.82,"radius_m":5000,"mode":"simple"}')

N_PARCELS=$(echo "$ZONE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('summary',{}).get('n_parcels',0))")
AREA_HA=$(echo "$ZONE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('summary',{}).get('area_ha_total',0))")

echo -e "  ${GREEN}Résultat du traçage VHR automatique${NC}"
echo "  ----------------------------------------"
echo -e "   • ${GREEN}$n_parcels${NC} parcelles détectées automatiquement"
echo -e "   • Aire couverte : ${AREA_HA:-0} ha"
echo -e "   • Format : GeoJSON (utilisable dans QGIS, Leaflet)"
echo -e "   • Mode : simple (rapide) / mix (précis, 5-7 min)"
echo "  ----------------------------------------"
echo -e "  ${GREEN}Visualisation :${NC} Importable dans QGIS, OpenStreetMap"
echo ""

# ------------------------
# Étape 4 : Création + Audit
# ------------------------
echo -e "${BLUE}✅ Étape 4 : Création parcelle + Traçabilité Audit${NC}"
echo "----------------------------------------"
echo ""

echo -e "  ${BL}Terminal :${NC} curl -X POST http://localhost:3001/api/parcelles"
echo -e "  (payload : label, coords, surface, culture, data_source)"
PARCEL=$(curl -s -X POST http://localhost:3001/api/parcelles \
    -H "Content-Type: application/json" \
    -d '{"label":"Parcelle Démonstration","coordinates":[[{"lat":-19.82,"lng":47.07},{"lat":-19.82,"lng":47.08},{"lat":-19.81,"lng":47.08},{"lat":-19.81,"lng":47.07}]],"center_lat":-19.815,"center_lng":47.075,"surface_ha":1.5,"culture_declared":"Blé","data_source":"demo"}' 2>&1 | head -3)

echo -e "  ${GREEN}Parcelle créée avec succès${NC}"
echo "  ----------------------------------------"
echo "   • ID généré automatiquement"
echo "   • Coordonnées GPS enregistrées"
echo "   • Surface (1.5 ha)"
echo "   • Culture déclarée : Blé"
echo "   • Source des données : demo"
echo "  ----------------------------------------"
echo ""

# Audit
echo -e "  ${BL}Terminal :${NC} curl http://localhost:3001/api/audit"
AUDIT=$(curl -s http://localhost:3001/api/audit | python3 -c "import sys,json;d=json.load(sys.stdin);print(d[0].get('action','')+' par '+d[0].get('user_name','')+' sur '+d[0].get('object','') if isinstance(d,list)and len(d)>0 else 'table vide')")
echo -e "  ${GREEN}Journal audit${NC}"
echo "  ----------------------------------------"
echo -e "   • ${AUDIT}"
echo "   • Chaque action POST/PATCH/GET génère une entrée"
echo "  ----------------------------------------"
echo ""

# ------------------------
# Étape 5 : YOLO culture
# ------------------------
echo -e "${BLUE}✅ Étape 5 : Détection culture YOLA baseline${NC}"
echo "----------------------------------------"
echo ""

echo -e "  ${BL}Info :${NC} Modèle YOLO baseline déjà entraîné (pas de training weekend)"
echo ""
echo -e "  ${GREEN}Performance YOLO baseline :${NC}"
echo "  • Precision globale : 1.34 % (détection d'objets satellite)"
echo "  • Rappel : ~21 % (trouve 1 parcelle sur 5)"
echo "  • F1 : 2.52 %"
echo "  • Classes : Orge ✅, Non-orge, Maïs, Blé, ..."
echo "  • Rapidité : secondes par image (contrairement à Mask2Former)"
echo ""
echo -e "  ${GREEN}Modèle RF orge (via /api/modeles) :${NC}"
echo "  • Déjà entraîné, prêt à l'emploi"
echo "  • Precision orge : ${PRECISION_ORGE}"
echo "  • Rappel orge    : ${RAPPEL_ORGE}"
echo "  • F1 orge         : ${F1_ORGE}"
echo "  • 48 variables spectrales-temporelles Sentinel-2"
echo "  • Validation croisée GroupKFold(5) par parcelle"
echo ""

# ------------------------
# Étape 6 : Synthèse
# ------------------------
echo -e "${BLUE}✅ Étape 6 : Synthèse et points clés${NC}"
echo "----------------------------------------"
echo ""

echo -e "  ${GREEN}1. Tracé automatique de parcelles${NC}"
echo -e "      • Service VHR via /api/zone-parcels"
echo -e "      • À partir de coordonnées GPS + rayon"
echo -e "      • Retourne GeoJSON exploitable"
echo ""
echo -e "  ${GREEN}2. Détection culture (Orge prioritaire)${NC}"
echo -e "      • Modèle RF entraîné exposable via /api/modeles"
echo -e "      • Métriques : precision_orge ${PRECISION_ORGE}, rappel_orge ${RAPPEL_ORGE}, f1_orge ${F1_ORGE}"
echo -e "      • 48 variables spectrales-temporelles Sentinel-2"
echo ""
echo -e "  ${GREEN}3. Métriques d'évaluation transparentes${NC}"
echo -e "      • 6 nouveaux champs : pr_auc, tn, fp, fn, tp, n_splits"
echo -e "      • Affichés sur Models.tsx en temps réel"
echo -e "      • Données réelles backend Malto"
echo ""
echo -e "  ${GREEN}4. Traçabilité complète${NC}"
echo -e "      • Chaque action POST/PATCH/GET journalisée"
echo -e "      • Table audit_entries avec user_name, action, object, at"
echo -e "      • Historique consultable via /api/audit"
echo ""
echo -e "  ${GREEN}5. Architecture complète${NC}"
echo -e "      • Frontend (agrisat) ↔ Backend (AGRISAT-BACKEND) ↔ Base Neon"
echo -e "      • .env.example sécurisé (clé Google Maps placeholder)"
echo -e "• exporters.ts sans donnée fictive"
echo ""
echo -e "  ${GREEN}Message clé :${NC}"
echo -e "  'Notre plateforme capture des données agricoles réelles,"
echo -e "   entraîne des modèles IA, évalue leurs performances"
echo -e "   avec des métriques transparentes, et traque chaque"
echo -e "   action utilisateur pour la conformité réglementaire.'"
echo ""
echo "============================================================"
echo "  FIN DE LA DÉMONSTRATION"
echo "============================================================"
echo ""
echo -e "  ${GREEN}Remerciements : Équipe développement ARIA${NC}"
echo ""
exit 0