#!/bin/bash

# Exécute la commande passée en argument et capture la sortie et les erreurs
COMMAND_OUTPUT=$($@ 2>&1)
EXIT_CODE=$?

# Si la commande a échoué
if [ $EXIT_CODE -ne 0 ]; then
  # Lire le prompt depuis le fichier
  PROMPT=$(cat debug-agent-prompt.txt)

  # Remplacer les placeholders dans le prompt
  PROMPT=${PROMPT//\{\{COMMAND\}\}/"$@"}
  PROMPT=${PROMPT//\{\{ERROR_LOG\}\}/"$COMMAND_OUTPUT"}

  # AFFICHER LE PROMPT (c'est ici que vous intégrerez l'appel à votre IA)
  echo "--- PROMPT POUR L'IA ---"
  echo "$PROMPT"
  echo "-------------------------"

  # Vous devrez remplacer la partie ci-dessus par l'appel à votre modèle de langage
  # Par exemple, si vous utilisez une API comme celle d'OpenAI, vous pourriez avoir quelque chose comme :
  # curl -s -X POST https://api.openai.com/v1/chat/completions \
  #   -H "Content-Type: application/json" \
  #   -H "Authorization: Bearer $OPENAI_API_KEY" \
  #   -d "{
  #         \"model\": \"gpt-4o\",
  #         \"messages\": [{\"role\": \"user\", \"content\": \"$PROMPT\"}]
  #       }" | jq -r '.choices[0].message.content'

else
  echo "La commande \"$@\" s'est exécutée avec succès."
  echo "$COMMAND_OUTPUT"
fi
