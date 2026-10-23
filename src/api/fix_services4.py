with open('services.ts', 'r', encoding='utf-8') as f:
    content = f.read()

start_marker = "    modes?: string[];\n  };\n"
end_marker = "\n/** Payload POST /api/analyze"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("ERREUR: start_marker non trouvé")
else:
    end_idx = content.find(end_marker, start_idx)
    if end_idx == -1:
        print("ERREUR: end_marker non trouvé")
    else:
        new_block = """  modes?: string[];
  };

/** Payload PATCH /api/parcelles/{id} — correction humaine d'une parcelle. */
export interface ParcelUpdate {
  culture_detected?: string;
  confidence?: number; // 0–100
  verdict?: string;
  details?: string;
  saison?: string;
}

/** Création d'une entrée d'audit (journal des actions utilisateurs). */
export interface AuditEntryCreate {
  user_name: string;
  action: string; // ex. 'correction', 'rejet', 'observation', 'connexion'
  object: string;   // ex. 'Parcelle <id>', 'Session analyste'
}

/** Entrée d'audit renvoyée par l'API. */
export interface AuditEntry {
  id: string;
  at: string;
  user_name: string;
  action: string;
  object: string;
}
"""
        new_content = content[:start_idx + len(start_marker)] + new_block + content[end_idx:]
        with open('services.ts', 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('OK: interfaces ajoutées proprement')
