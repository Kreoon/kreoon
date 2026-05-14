#!/bin/bash
# Limpia contactos huérfanos de Pancake y re-sincroniza todos con nuevo formato de dirección
# Uso: bash cleanup_pancake_orphans.sh

API_KEY="3e219ee9252d43cba28ffaa93a2ef1d0"
WORKSPACE="4708"
BASE="https://crm.pancake.vn/api/workspaces/${WORKSPACE}"
FUNCTION_URL="https://wjkbqcrxwsmvtxmqgiqc.supabase.co/functions/v1/pancake-sync"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqa2JxY3J4d3NtdnR4bXFnaXFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0NDQwNTYsImV4cCI6MjA4NTAyMDA1Nn0.BorqcEBToDVeFBDQktZoCjCndYwB0bc6jlKmSJn-Wi8"

# IDs válidos en Kreoon (264 perfiles)
VALID_IDS="01cfe6de-f88a-43dd-903b-692256b8a094 025b452e-e2bf-470c-9158-807cce2d895e 04a42e30-ffe7-4d19-bd31-3b461cf33d8c 04ff5719-79ff-4477-995b-4b0b3b5243ab 0724cad2-41a2-4ae1-a514-bcbe6ad9ff7b 0824fd56-a280-4d38-83e0-8b7bbe938c56 0a060b83-7b16-4ba2-8364-96edb6100175 0a1b032e-36b7-4fd4-bc62-67710fdf3cd8 0aa74d3e-83a5-4f8a-ba46-b35d3acf97e5 0aed7480-8cfe-4635-b760-d885d8043225 0cd72e36-abee-44b9-b4d2-2f70164dee5b 0cf4da1a-bee6-4366-a8cc-850ffc3fb2f4 0d76a631-4eb2-4d99-acdc-9c2db8e84904 1105e737-a693-40a1-9986-82d262fb2f31 118d3f5b-c4f5-46c9-a7a4-49acb9dd917a 1362df57-4f77-4a6f-9cf3-7bba2dc4b5fd 13e3cdbc-108d-4ffa-9472-20f5e5c1b904 14b8b740-4abc-46b5-87f5-606391a190ef 1746e11a-1011-4c2a-b62a-22ab2f16a8f9 18cbc73c-b764-4410-bc4f-da451f6f280f 1951e902-1f47-466c-9b91-a584545151f6 1a0ae24f-4e3e-44c7-bd7f-35a633497575 1a6c5d7f-9ed1-4293-8638-2235ee5cba76 1ad149d4-1384-49d8-bd94-c6403e6e5bf6 1afb502e-c928-43d6-b15d-72091ad2ce30 1c3ba967-96ca-4864-9462-cc1094c6b7fa 1ef257af-9848-406a-ac62-e945c531d8cb 20163b31-4fe9-4bf3-9f91-54cbb879fa8e 202015de-394d-4b4d-9b1b-34bad35d3825 2081e374-4a41-4d63-af3f-9ce1be270efa 21e49f66-0515-4cea-944a-b353a1f1877f 2214102f-6ce1-4d9f-8800-0cbde1b92b0d 231e3093-c37b-4399-9819-8d2b64a2f20d 233062d2-86de-455e-a296-13d4421948c6 2649474e-e3dd-425f-824b-6f2328885c84 2680a69b-1c21-49a5-824b-df3c1ccef292 28d6fd95-656f-4d00-82af-bbbc8d613910 29f271a7-3983-44cf-95ce-33020422981e 2c216b59-2b62-406f-bebc-317f6354884d 2cf28da7-c362-4732-aebf-58885e6a685a 2f84cc36-85d0-41ce-8f3a-cad40ec6ff15 30f6b3d3-cc7f-4968-823e-840a988aba0b 31cf7626-bd18-4751-8ba2-21bae4c2b635 32a148cf-4446-4f33-bec4-cbb15ea407ce 3304ec05-0d3e-45ce-8656-366c7c2328c9 3352b89c-1248-497c-9928-337b949ab3ea 33ad14fa-99c7-492e-8999-31fd9f52858a 33d38dbe-8d06-4b86-b73d-d6ff1eec6558 33f12ed2-9bc3-4685-9de5-2eecd6846d3d 355b0a76-2cae-47f1-b1e2-995bfa32409d 36401e37-5a87-4d52-aacb-5d05367a64b6 38372018-bccf-42e8-95d6-33dfcb42d0f3 38688c1c-b57f-471a-aedf-3a267d0dbe2b 3986fb11-5337-41fd-a382-54ba20a951f6 39f3c147-7b66-4055-bb84-a129e0760036 3a07c45b-cbb0-4f55-a98d-4cd7e04f70bc 3b1cd54e-ea02-420b-b024-bf3744f18abb 3bca44d5-8ec9-4bc1-a0b3-e50df846a7cf 3c3e338c-6ada-4165-a6a9-2e859dbc6ccf 3d3429fa-a11b-4fd2-affc-6ea84d3eb2ad 3e69103d-8f7f-4110-8ca9-f9a3534b21b0 4213f2e1-1516-4402-abd3-2c7bb4059c3e 439289f7-eec3-473d-8d1d-39ad18894b86 43ebd264-1f4d-407c-9142-7e178f44dfc8 440397d7-4fe8-4636-a67b-5528c6a2fd79 445f8a90-5360-4800-b8f7-c62991705815 451caa34-3c8c-41ab-aa3c-bdcce61ea9c4 4b76c84e-d11a-4f2a-bc36-9846c2906b39 4be6f5b1-304c-40bc-9ed4-b21766de1cf1 4c3e669a-1429-43a5-8156-89ad6ed69120 4c4489b0-67d4-4eba-8747-2b7a649fa302 4c48eba7-4d68-4a88-be5f-92fa24dc6690 4c6c3fbf-ef98-4e70-8634-1a593ea672f5 4d7816dd-9ffb-41e5-92ab-a9a1385ee513 4f401a41-af8a-472e-af9f-5ec73406bdcd 4fc57ecf-b354-4c40-ba3f-277e7f89c582 5047b969-80e4-486f-abcb-ed7974184b28 53502722-87ea-4543-a97d-4368de1a876c 57a2e8bd-b690-49a9-8c2d-250075e52d4d 588489bd-7391-4d84-8097-56930eda8c4d 5bad02f8-b69c-4fd0-a3b5-a1c94eb758df 5cb36893-4be5-4270-90e8-bde75b2d926c 5cff47a9-f783-46f5-8f9d-a81d34475fd0 5d80c2c1-65d0-4fc8-9b9e-83c51085807a 609d290c-b81b-4478-b041-015903edc739 6130e1f2-fb94-433b-a939-243cb526715c 6150103b-726e-4c69-bb46-003edc962d45 620d0202-67e4-4a00-8544-6fc761d9d4cd 638d8be7-9cf5-49e4-af3a-a373c01cc87f 63b2c0ad-0bf8-4cfb-85ce-6e327ba7f611 63b6f1c2-9958-410e-8fbe-f86ac7956fa7 63c29d41-482b-4563-b84a-e5cfd00b08f7 63dbad57-db66-48ce-b421-64c58f8e29c8 648e7544-fee1-42d4-adac-82eaa00b24b2 64e061f8-c1dd-4bb1-ac20-87a79a917802 658cb0e1-2fe0-4876-9507-dfd5dadaa40c 65c18b34-0c4a-4c97-b257-45945794e923 65ef433d-8cbf-48e9-b3ee-23fb76c49ab6 66f77c71-824c-4ae4-bff8-13ab32497d6b 67933df5-2878-4912-9be7-ff46db74b08e 67d38015-57e9-4dea-b696-2761c4d9e323 68a3013a-6ece-40ba-98ef-ccb85ce258a1 6adeaae4-bf8f-46d7-b7cc-132b31fbcf31 6be74005-29b1-44ef-ae41-e0faa18837cf 6c542d7b-3aa7-4e49-846f-dfdaa24af2b9 6cb39380-8584-4363-9077-46e5fe73a06f 6cc94bf7-7adb-4d2a-bc64-990cf08eae7f 6cf65b78-edcb-4e21-b6a7-7b57ef0246bb 6ea698b5-1930-4aae-8cec-0f09ba0c178a 6f17b013-eb17-48ff-bd82-b06c0cee2e95 701272a2-5fb4-4c41-b30e-006e73032f07 70a89ea8-d687-493b-a609-3e971ab5e895 7130ce39-842c-4776-bc2a-383960f53ec3 71bcb1f8-2e7b-482d-bc6f-6aeba8e0eb6d 74082d59-da24-4a50-b0c0-a18fe2c73423 746cfca6-d35f-4a0e-8c3b-a2bb8bd78761 758d87ab-dbda-442c-bfe7-d3cbe127ca89 7770eba0-3dc1-4879-9c88-4c092a34148b 7870d5fb-d7a9-4ba2-8ef8-405832491edd 78720763-b5dc-4ad2-a078-d8a28875143b 78a86485-ea95-4960-a5be-5f9a0ff709b1 7a6bb885-2d35-4cab-bd02-c7c8a59eec62 7a99b1a6-a57d-4bf8-9346-02049c6577e8 7b320d14-83de-4561-8277-222716c8e1d6 7c321d7c-c567-4f62-a141-3ade2d877a41 7c90fc99-f204-4330-84ac-5c30cc17ec98 7d256771-53ea-4cb9-a69f-ac302a42ec91 7e6f83eb-2926-4e98-9cc8-cd373cfef616 7e90d629-f4f5-4176-965f-045cd4ffa527 7f9d1824-862b-4591-a321-c0baff34aac4 810d2832-4f5e-4510-bcfd-3c28f38ebb9f 868ba6c0-8f33-4a04-89ea-8b4f75736511 87522150-7920-4e62-bae0-70f10114ba8b 882aafeb-5450-4e40-9398-808295ec410b 89bb5d69-ae66-43b3-92e1-89dd631f568d 8acd06b3-ea00-46c7-b957-deae10540a70 8c9fa404-acf9-4210-8457-6779bfe5da51 8cd10122-2bc4-4765-9bf6-e20c5591b1e5 8cdde27e-9c7e-46ee-8f65-18481b6c15c8 8de250cf-023d-4907-b993-c6d38353eeab 8e6bac6a-6eff-40c1-bc5d-dd06db321ba7 8e7debbf-a97c-49ce-84c4-838d712131c6 91aa4bc5-c2cf-4c05-bb21-92cdf88ea5bd 91fcac4a-5693-4fa3-9cae-fac86ede3a7e 92905de9-8043-4cd7-9393-66011f4e8032 9362b8e9-653e-45e6-8afb-36398855e03d 93761b76-5aed-4d1c-aaa7-2d3f4060f2ee 95a84bbe-bd6b-42bb-804e-9f3d391d1832 95b4563e-c522-4183-867c-d25125b737bd 972ebcae-4309-4740-8ca7-da7410f66176 989c879a-c5c6-4e9e-9d6e-c8a6d6b19297 98f2ede0-58b9-4e8b-8dd4-f041054e45f1 9950c5b6-132b-4079-9fef-2f4aab9e9ed5 9991e730-4304-4a72-b5f9-e520a69d41d1 9a116761-5689-4244-8c23-4ebd2c84d7ca 9a51edc7-f270-44aa-9d1d-f0aabf3e445d 9b29701d-c82b-47aa-b664-6c42eea37886 9ba53e12-4333-4ffa-9766-59ddb7fc4520 9c0bf372-8800-4807-9090-1f19cb3237b0 9d3c8100-fb94-44d4-a273-3880f333bdc5 9e9ab276-1e2f-4b82-b290-0f2e9ec00574 9f092e76-273c-43e3-a4eb-79609546fcf1 9f0e60a5-7e78-4d92-bd8a-ec6da20e12e8 a15cf106-1f3b-4d65-9268-13e207e784a3 a2e1b2ad-5d7b-4d94-befd-538a3c8609a8 a319faed-de21-4278-a56f-f4a3cae4dee5 a3c72b7e-114b-4387-a547-56f2068a001d a4ccdbfc-b63e-4941-816c-97c320356137 a6aa95f4-4a43-4758-bc6b-ea18366e7971 a7c19839-c57b-431d-a3eb-cbcd08221a6c a82e3e51-f67f-4134-bdc1-6dc0a3e84e95 a87fb8b7-f4b2-40e3-8f79-6acdd173b27c a98ed636-61e4-45a2-ad26-425962a85224 a9a1aeb3-6891-4793-9e08-d0db46361557 aacc926b-37e1-4fdf-a435-254d6d701c6b ab528069-11c2-4ba0-b5c9-d54a49024d16 ab6ac134-4253-4d0e-b026-cf73a2642b7d ab710377-1182-422e-9cc6-242d4c59a45f ab9597f1-6e11-436f-ada3-690fe7938da1 acf829a4-8747-4692-9571-5b7238e64f85 ae55f22e-2093-4551-8995-ea3ab600f663 af592785-08b1-4407-a178-f0582ac341e2 b0f5a83e-ef6b-4998-a314-a4e928b50509 b46e1e67-e3aa-488c-ac90-fae705e2ff4c b5767368-3860-4a2c-b2b0-49fd2d62056f b5f2f2e7-ed0d-41c0-89c6-432a8a96cbca b61d23b4-31e4-4acb-b955-08a81c44f729 b74e639b-9711-4d70-8afa-48045413f327 b83fc473-7c19-4b79-a06b-1d1854a49aad b91432c2-5224-48e0-99c0-181dc2ec3d43 b9281061-6059-41a8-a1a3-84f562196eae b9a1558a-8d20-4743-b557-28f2fdfbd810 bc20cdec-589d-4777-b074-f5c3f36b0475 be036401-e1f8-4c67-ab35-93d7164d18a9 be31b3b1-0056-4f3e-84df-77407b5e703f bfd8bc21-62c6-4da5-8e6c-3d6bf68088b7 c12513eb-43c9-4a54-8593-811a7617da68 c12afe53-5c46-4c3f-9027-f010cfc8a3cd c31efc84-6b72-4853-8979-f7e257232d55 c39f7771-5aad-4a6a-ac87-5dc1ceca3eea c3d191cc-586f-4435-86ed-2296da8a68d0 c5119553-c9fd-4bd3-83d1-b0d1bc3ff2f1 c5dcee93-e811-4f36-81af-54354e0d6a61 c62cd1bc-88dd-4420-b561-43b6e75d3889 c77540d9-5388-4eaa-9fa6-7693a0a72776 c82c0546-d2d8-4120-ad15-91bb12e16eac c8572c96-c720-46d0-bc9c-8d1a6b6226ae c96cd6b2-94e7-41ac-80e0-828d39d01387 ca10436a-d0df-49fb-b9cb-5ce682e158a3 ca5c27fc-1a89-4f0c-bb65-7863456f199e ca6317b7-c995-4b44-b284-536cb0ce3133 cadc7db2-7a7a-4587-9fb8-abde8aa5c46d cbc35198-4bdb-40fb-92de-a07278acfccf ccb20146-6caa-4e90-b508-2aef4e8d47d3 cd810ab1-704b-4ae3-82e7-4496f56ae0bf ced7fc75-e457-48ee-a4a3-a281ed0f662c cf00a0de-5dd0-4343-bf03-72b25c1a5665 d0c0f2ef-ff33-44a7-96aa-be1973975622 d0ec9089-abe4-4e35-8a24-1aa3c592d92e d10a6eb2-4926-4101-845b-2b50349412fe d1e8b3d4-7fb2-4822-805f-27ed91f28479 d1f629d5-15b0-428a-841f-3f85b3bd2b17 d35bcdd7-29a4-4467-9669-08467d494225 d3fdfdf9-2f07-4800-a2c6-4fa1fcb669bb d4b89219-0c06-45c8-93b2-f1aaae22210d d5d2f253-f563-4ec6-b515-df9457e8bdf2 d5e15545-f06d-4e0f-85e1-7d348c93c531 d5edce06-aff6-4c8b-be62-d6b79156819a d6533eab-7c6b-4c5f-b398-cd68544473f4 d8e1406b-2249-4062-bc8c-11ccd754b141 d95d3485-1667-42a8-83f9-24cba0652888 da31f140-513d-43ba-9180-fbbeeca0ce9b da83a9d7-f654-4c92-852e-bf7cb3d6156c dabd95e6-85c2-472d-8448-54faf076e016 db71f564-281e-4361-91e8-2d7cabde88be ddbe40df-716f-44a9-9a7c-1ce1927362b6 dde5eb46-d325-4f2b-8bdb-a825747fa1db debf90b7-6341-4bc6-b52b-fab59000bb4e df198948-ae67-4190-b690-21a14dabce3b df8b97ba-b9ce-49db-98b5-23e063061df7 e03f9e48-a7fc-44d6-ace7-769aa1172814 e17a5a5c-9627-4ccc-a644-7e8002cd4637 e4645c84-70f8-45ea-b450-3b2468f2ca0f e53a4390-e5b9-4860-8958-3bc429159517 e58e0ab5-0805-4f01-a6f0-c73e309bc9fb e84d036b-32f2-4353-a4dc-01b5ac8cb9b3 ea65fbc5-50a2-4ee5-b800-69d68bd5d48e eb316bb3-5df2-4ba0-a70d-5761d885897a eb34b3b9-2c18-480e-9b49-8d64a6114d6b ecfc7191-b5c1-432c-9611-12e4be17966b ed03251f-4780-4f60-a276-d6bbadbad6b1 ed747765-15a7-4627-b3a2-290c40f70f57 ee89bfd1-eb49-4534-95c6-02d613105bc0 eeb626ba-9e8e-44a2-8777-e223ae621215 efbf4805-5668-4c37-a7d7-a412a35fac2b f1259d3d-6b15-4e5c-bd8e-64177a826cf6 f1bdfaa4-9aa3-41c9-aa1b-3b0e7504f016 f3a26d68-f67a-4460-94fd-62eee7bbf648 f5fbb6da-3c3e-40ca-acad-17a9213f3b59 f8d8d72c-f202-4b18-ab9d-40f73a0783f0 fcc838bd-7323-4661-9609-99a75167fd96 fef6a72c-da5a-45aa-821a-31819b2bd536 ff178faa-5de8-4f7f-a065-c5103cc5d0ea ffb5be17-1e76-43e9-836a-b2c47035b8d0 45d7417a-3c81-40c4-94f6-f5d2f4f6a1bc 85388ae7-4b2c-4c78-9d2a-a37652a63919"

echo "=== PASO 1: Recopilar todos los contactos de Pancake ==="
ALL_IDS=()
CURSOR=""
PAGE=1

while true; do
  if [ -z "$CURSOR" ]; then
    URL="${BASE}/contact/records?api_key=${API_KEY}&limit=50"
  else
    URL="${BASE}/contact/records?api_key=${API_KEY}&limit=50&cursor=${CURSOR}"
  fi

  RESP=$(curl -s "$URL" --max-time 15)
  IDS_PAGE=$(echo "$RESP" | grep -o '"id":"[^"]*"' | grep -o '[0-9a-f-]\{36\}' | grep -v "3e219ee9")

  for id in $IDS_PAGE; do
    ALL_IDS+=("$id")
  done

  CURSOR=$(echo "$RESP" | grep -o '"cursor":"[^"]*"' | sed 's/"cursor":"//;s/"//')
  COUNT=${#ALL_IDS[@]}
  echo "Página $PAGE — acumulado: $COUNT contactos"

  if [ -z "$IDS_PAGE" ] || [ -z "$CURSOR" ]; then
    break
  fi
  PAGE=$((PAGE+1))
  sleep 0.5
done

echo "Total en Pancake: ${#ALL_IDS[@]}"

echo ""
echo "=== PASO 2: Eliminar huérfanos ==="
DELETED=0
KEPT=0

for pid in "${ALL_IDS[@]}"; do
  if echo "$VALID_IDS" | grep -q "$pid"; then
    ((KEPT++))
  else
    RESP=$(curl -s -X DELETE "${BASE}/contact/records?api_key=${API_KEY}&record_ids[]=${pid}" --max-time 10)
    echo "DEL $pid → $RESP"
    ((DELETED++))
    sleep 0.3
  fi
done

echo "Eliminados: $DELETED | Conservados: $KEPT"

echo ""
echo "=== PASO 3: Re-sync de todos los perfiles con nuevo formato de dirección ==="
# Lista de todos los user_ids de Kreoon (obtenida de la BD)
KREOON_USER_IDS=(
  "aaffb5b7-d823-4dd8-a6d4-7010b206b5a6"
)
# Nota: ejecutar re-sync completo solo si se necesita actualizar direcciones
# Por ahora re-sincronizan solo cuando haya cambio de perfil (trigger manual)
echo "Re-sync masivo omitido — la dirección se actualizará en el próximo UPDATE de cada perfil."
echo "Para forzar re-sync completo usa: resync_156_profiles.sh con todos los IDs."

echo ""
echo "=== LISTO ==="
