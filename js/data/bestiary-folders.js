// Fichier généré par node tools/build-bestiary-folders.mjs depuis le bestiaire et tools/token-images-categories.csv : ne pas modifier à la main.
// Régénérer après un ajout de profils ou un changement du classement (node tools/build-bestiary-folders.mjs).
// Dossiers de la Bibliothèque de bestiaire, parents avant enfants ; chaque profil (id) est dans un seul dossier.
export const BESTIARY_FOLDERS = Object.freeze([
  Object.freeze({ id: 'bestiaire', parent: null, label: 'Bestiaire',
    profiles: Object.freeze([
      'E0-P-139', 'E0-P-140', 'E0-P-141', 'E0-P-142', 'E0-P-143', 'E0-P-144', 'E0-P-180', 'E0-P-181',
      'E0-P-182', 'E0-P-183', 'E0-P-184', 'E0-P-194', 'E0-P-199', 'E0-P-073', 'E0-P-074', 'E0-P-075',
      'E0-P-076', 'E0-P-077', 'E0-P-078', 'E0-P-245', 'E0-P-270', 'E0-P-271', 'E0-P-272', 'E0-P-273',
      'E0-P-274', 'E0-P-275', 'E0-P-276', 'E0-P-278', 'E0-P-279', 'E0-P-280', 'E0-P-281', 'E0-P-282',
      'E0-P-283', 'E0-P-284', 'E0-P-285', 'E0-P-286', 'E0-P-287', 'E0-P-288', 'E0-P-289', 'E0-P-290',
      'E0-P-291', 'E0-P-292', 'E0-P-293', 'E0-P-294', 'E0-P-304', 'E0-P-369', 'E0-P-001', 'E0-P-003',
      'E0-P-007', 'E0-P-021', 'E0-P-032', 'E0-P-033', 'E0-P-036', 'E0-P-039', 'E0-P-046', 'E0-P-048',
      'E0-P-052', 'E0-P-053', 'E0-P-412', 'E0-P-413', 'E0-P-457', 'E0-P-458', 'E0-P-487', 'E0-P-528',
      'E0-P-529', 'E0-P-530', 'E0-P-600', 'E0-P-743', 'E0-P-744', 'E0-P-759', 'E0-P-760', 'E0-P-761',
      'E0-P-762', 'E0-P-763', 'E0-P-764', 'E0-P-765', 'E0-P-766', 'E0-P-792', 'E0-P-801', 'E0-P-836',
      'E0-P-905', 'E0-P-906', 'E0-P-907', 'E0-P-908', 'E0-P-958', 'E0-P-959', 'E0-P-962', 'E0-P-985',
      'E0-P-986', 'E0-P-987', 'E0-P-988', 'E0-P-989', 'E0-P-990', 'E0-P-991', 'E0-P-1031', 'E0-P-1094'
    ]) }),
  Object.freeze({ id: 'monstres', parent: null, label: 'Monstres',
    profiles: Object.freeze([
      'E0-P-079', 'E0-P-081', 'E0-P-082', 'E0-P-083', 'E0-P-084', 'E0-P-085', 'E0-P-086', 'E0-P-087',
      'E0-P-088', 'E0-P-253', 'E0-P-277', 'E0-P-319', 'E0-P-323', 'E0-P-004', 'E0-P-011', 'E0-P-012',
      'E0-P-017', 'E0-P-019', 'E0-P-022', 'E0-P-027', 'E0-P-029', 'E0-P-030', 'E0-P-031', 'E0-P-037',
      'E0-P-038', 'E0-P-041', 'E0-P-042', 'E0-P-045', 'E0-P-054', 'E0-P-056', 'E0-P-057', 'E0-P-058',
      'E0-P-403', 'E0-P-417', 'E0-P-452', 'E0-P-459', 'E0-P-478', 'E0-P-488', 'E0-P-489', 'E0-P-490',
      'E0-P-491', 'E0-P-507', 'E0-P-515', 'E0-P-524', 'E0-P-525', 'E0-P-526', 'E0-P-527', 'E0-P-668',
      'E0-P-669', 'E0-P-670', 'E0-P-671', 'E0-P-672', 'E0-P-673', 'E0-P-674', 'E0-P-691', 'E0-P-742',
      'E0-P-807', 'E0-P-909', 'E0-P-910', 'E0-P-912', 'E0-P-913', 'E0-P-915', 'E0-P-916', 'E0-P-917',
      'E0-P-918', 'E0-P-960', 'E0-P-961', 'E0-P-963', 'E0-P-1055', 'E0-P-1072', 'E0-P-1073', 'E0-P-1074',
      'E0-P-1075', 'E0-P-1076', 'E0-P-1077', 'E0-P-1078', 'E0-P-1079', 'E0-P-1080', 'E0-P-1081', 'E0-P-1082',
      'E0-P-1083', 'E0-P-1084', 'E0-P-1085', 'E0-P-1086', 'E0-P-1087', 'E0-P-1088', 'E0-P-1089', 'E0-P-1091',
      'E0-P-1135', 'E0-P-1136', 'E0-P-1140'
    ]) }),
  Object.freeze({ id: 'ennemis', parent: null, label: 'Ennemis',
    profiles: Object.freeze([]) }),
  Object.freeze({ id: 'ennemis/demons', parent: 'ennemis', label: 'Démons',
    profiles: Object.freeze([
      'E0-P-107', 'E0-P-108', 'E0-P-534', 'E0-P-551', 'E0-P-665', 'E0-P-689', 'E0-P-788', 'E0-P-789',
      'E0-P-790', 'E0-P-843', 'E0-P-1002', 'E0-P-1071', 'E0-P-1095', 'E0-P-1096', 'E0-P-1097', 'E0-P-1098',
      'E0-P-1099', 'E0-P-1100', 'E0-P-1101', 'E0-P-1102', 'E0-P-1103', 'E0-P-1104', 'E0-P-1105', 'E0-P-1106',
      'E0-P-1107', 'E0-P-1108', 'E0-P-1109', 'E0-P-1110', 'E0-P-1111', 'E0-P-1112', 'E0-P-1114', 'E0-P-1115',
      'E0-P-1116', 'E0-P-1117'
    ]) }),
  Object.freeze({ id: 'ennemis/elfes-noirs', parent: 'ennemis', label: 'Elfes noirs',
    profiles: Object.freeze([
      'E0-P-311', 'E0-P-312', 'E0-P-313', 'E0-P-314', 'E0-P-315', 'E0-P-316', 'E0-P-317', 'E0-P-318',
      'E0-P-320', 'E0-P-321', 'E0-P-322', 'E0-P-324', 'E0-P-325', 'E0-P-035', 'E0-P-911'
    ]) }),
  Object.freeze({ id: 'ennemis/gobelins', parent: 'ennemis', label: 'Gobelins',
    profiles: Object.freeze([
      'E0-P-080', 'E0-P-089', 'E0-P-092', 'E0-P-005', 'E0-P-006', 'E0-P-015', 'E0-P-016', 'E0-P-393',
      'E0-P-394', 'E0-P-395', 'E0-P-396', 'E0-P-400', 'E0-P-401', 'E0-P-407', 'E0-P-414', 'E0-P-416',
      'E0-P-677', 'E0-P-692', 'E0-P-1056'
    ]) }),
  Object.freeze({ id: 'ennemis/hommes-betes', parent: 'ennemis', label: 'Hommes-bêtes',
    profiles: Object.freeze([
      'E0-P-101', 'E0-P-102', 'E0-P-103', 'E0-P-009', 'E0-P-704', 'E0-P-707', 'E0-P-708', 'E0-P-804',
      'E0-P-1012'
    ]) }),
  Object.freeze({ id: 'ennemis/hommes-lezards', parent: 'ennemis', label: 'Hommes-lézards',
    profiles: Object.freeze([
      'E0-P-246', 'E0-P-256', 'E0-P-257', 'E0-P-258', 'E0-P-259', 'E0-P-260', 'E0-P-261', 'E0-P-263',
      'E0-P-264', 'E0-P-265', 'E0-P-267', 'E0-P-268', 'E0-P-295', 'E0-P-296', 'E0-P-297', 'E0-P-298',
      'E0-P-299', 'E0-P-300', 'E0-P-301', 'E0-P-302', 'E0-P-303', 'E0-P-305', 'E0-P-306', 'E0-P-307',
      'E0-P-049', 'E0-P-050', 'E0-P-051'
    ]) }),
  Object.freeze({ id: 'ennemis/morts-vivants', parent: 'ennemis', label: 'Morts-vivants',
    profiles: Object.freeze([
      'E0-P-091', 'E0-P-093', 'E0-P-094', 'E0-P-095', 'E0-P-096', 'E0-P-097', 'E0-P-098', 'E0-P-371',
      'E0-P-373', 'E0-P-374', 'E0-P-375', 'E0-P-060', 'E0-P-565', 'E0-P-566', 'E0-P-567', 'E0-P-568',
      'E0-P-570', 'E0-P-571', 'E0-P-599', 'E0-P-612', 'E0-P-690', 'E0-P-693', 'E0-P-712', 'E0-P-713',
      'E0-P-714', 'E0-P-715', 'E0-P-756', 'E0-P-757', 'E0-P-758', 'E0-P-838', 'E0-P-914', 'E0-P-984',
      'E0-P-1125', 'E0-P-1126', 'E0-P-1127', 'E0-P-1128', 'E0-P-1129', 'E0-P-1130', 'E0-P-1131', 'E0-P-1132',
      'E0-P-1133', 'E0-P-1134', 'E0-P-1137', 'E0-P-1138', 'E0-P-1139'
    ]) }),
  Object.freeze({ id: 'ennemis/ogres', parent: 'ennemis', label: 'Ogres',
    profiles: Object.freeze([
      'E0-P-127', 'E0-P-072', 'E0-P-013', 'E0-P-402', 'E0-P-415', 'E0-P-506', 'E0-P-1057'
    ]) }),
  Object.freeze({ id: 'ennemis/orcs', parent: 'ennemis', label: 'Orcs',
    profiles: Object.freeze([
      'E0-P-090', 'E0-P-308', 'E0-P-309', 'E0-P-310', 'E0-P-397', 'E0-P-398', 'E0-P-399', 'E0-P-509',
      'E0-P-1058'
    ]) }),
  Object.freeze({ id: 'ennemis/reprouves', parent: 'ennemis', label: 'Réprouvés',
    profiles: Object.freeze([
      'E0-P-104', 'E0-P-105', 'E0-P-106', 'E0-P-044', 'E0-P-554', 'E0-P-556', 'E0-P-657', 'E0-P-664',
      'E0-P-739', 'E0-P-745', 'E0-P-840', 'E0-P-859', 'E0-P-870', 'E0-P-997', 'E0-P-998', 'E0-P-1092',
      'E0-P-1093'
    ]) }),
  Object.freeze({ id: 'ennemis/skavens', parent: 'ennemis', label: 'Skavens',
    profiles: Object.freeze([
      'E0-P-109', 'E0-P-110', 'E0-P-111', 'E0-P-023', 'E0-P-024', 'E0-P-025', 'E0-P-026', 'E0-P-061',
      'E0-P-062', 'E0-P-511', 'E0-P-512', 'E0-P-513', 'E0-P-555', 'E0-P-557', 'E0-P-718', 'E0-P-720',
      'E0-P-721', 'E0-P-723', 'E0-P-725', 'E0-P-726', 'E0-P-730', 'E0-P-731', 'E0-P-732', 'E0-P-733',
      'E0-P-734', 'E0-P-735', 'E0-P-736', 'E0-P-737', 'E0-P-894', 'E0-P-1015'
    ]) }),
  Object.freeze({ id: 'ennemis/vampires', parent: 'ennemis', label: 'Vampires',
    profiles: Object.freeze([
      'E0-P-099', 'E0-P-100', 'E0-P-926', 'E0-P-1141'
    ]) }),
  Object.freeze({ id: 'ennemis/vampires-pirates', parent: 'ennemis', label: 'Vampires pirates',
    profiles: Object.freeze([
      'E0-P-1059', 'E0-P-1060'
    ]) }),
  Object.freeze({ id: 'peuples', parent: null, label: 'Peuples',
    profiles: Object.freeze([]) }),
  Object.freeze({ id: 'peuples/elfes', parent: 'peuples', label: 'Elfes',
    profiles: Object.freeze([
      'E0-P-066', 'E0-P-473', 'E0-P-474'
    ]) }),
  Object.freeze({ id: 'peuples/gnomes', parent: 'peuples', label: 'Gnomes',
    profiles: Object.freeze([
      'E0-P-071'
    ]) }),
  Object.freeze({ id: 'peuples/halflings', parent: 'peuples', label: 'Halflings',
    profiles: Object.freeze([
      'E0-P-064', 'E0-P-070'
    ]) }),
  Object.freeze({ id: 'peuples/humains', parent: 'peuples', label: 'Humains',
    profiles: Object.freeze([
      'E0-P-132', 'E0-P-163', 'E0-P-164', 'E0-P-165', 'E0-P-166', 'E0-P-167', 'E0-P-168', 'E0-P-169',
      'E0-P-174', 'E0-P-175', 'E0-P-176', 'E0-P-177', 'E0-P-178', 'E0-P-063', 'E0-P-067', 'E0-P-068',
      'E0-P-069', 'E0-P-347', 'E0-P-460', 'E0-P-461', 'E0-P-463', 'E0-P-464', 'E0-P-465', 'E0-P-559',
      'E0-P-562', 'E0-P-563', 'E0-P-569', 'E0-P-605', 'E0-P-606', 'E0-P-666', 'E0-P-667', 'E0-P-685',
      'E0-P-687', 'E0-P-701', 'E0-P-702', 'E0-P-750', 'E0-P-752', 'E0-P-755', 'E0-P-798', 'E0-P-800',
      'E0-P-817', 'E0-P-819', 'E0-P-828', 'E0-P-830', 'E0-P-833', 'E0-P-837', 'E0-P-841', 'E0-P-846',
      'E0-P-847', 'E0-P-848', 'E0-P-849', 'E0-P-850', 'E0-P-851', 'E0-P-855', 'E0-P-857', 'E0-P-861',
      'E0-P-862', 'E0-P-863', 'E0-P-864', 'E0-P-865', 'E0-P-899', 'E0-P-900', 'E0-P-901', 'E0-P-902',
      'E0-P-903', 'E0-P-904', 'E0-P-953', 'E0-P-967', 'E0-P-969', 'E0-P-970', 'E0-P-971', 'E0-P-974',
      'E0-P-975', 'E0-P-976', 'E0-P-977', 'E0-P-978', 'E0-P-980', 'E0-P-981'
    ]) }),
  Object.freeze({ id: 'peuples/nains', parent: 'peuples', label: 'Nains',
    profiles: Object.freeze([
      'E0-P-065', 'E0-P-607', 'E0-P-979'
    ]) }),
  Object.freeze({ id: 'pnj', parent: null, label: 'PNJ nommés',
    profiles: Object.freeze([]) }),
  Object.freeze({ id: 'pnj/l01', parent: 'pnj', label: 'L01 — Archives of the Empire 2',
    profiles: Object.freeze([
      'E0-P-123', 'E0-P-124', 'E0-P-125', 'E0-P-126', 'E0-P-128', 'E0-P-129', 'E0-P-130', 'E0-P-131',
      'E0-P-133', 'E0-P-134', 'E0-P-135', 'E0-P-136', 'E0-P-137'
    ]) }),
  Object.freeze({ id: 'pnj/l02', parent: 'pnj', label: 'L02 — Archives of the Empire 3',
    profiles: Object.freeze([
      'E0-P-138', 'E0-P-145', 'E0-P-146', 'E0-P-147', 'E0-P-148', 'E0-P-149'
    ]) }),
  Object.freeze({ id: 'pnj/l03', parent: 'pnj', label: 'L03 — Archives of the Empire Volume 1',
    profiles: Object.freeze([
      'E0-P-150', 'E0-P-151', 'E0-P-152', 'E0-P-153', 'E0-P-154', 'E0-P-155', 'E0-P-156', 'E0-P-157',
      'E0-P-158', 'E0-P-159', 'E0-P-160', 'E0-P-161', 'E0-P-162'
    ]) }),
  Object.freeze({ id: 'pnj/l04', parent: 'pnj', label: 'L04 — Deft Steps, Light Fingers',
    profiles: Object.freeze([
      'E0-P-170', 'E0-P-171', 'E0-P-172', 'E0-P-173', 'E0-P-179'
    ]) }),
  Object.freeze({ id: 'pnj/l06', parent: 'pnj', label: 'L06 — Livre de base V5',
    profiles: Object.freeze([
      'E0-P-119', 'E0-P-120', 'E0-P-121', 'E0-P-122'
    ]) }),
  Object.freeze({ id: 'pnj/l07', parent: 'pnj', label: 'L07 — Lustria',
    profiles: Object.freeze([
      'E0-P-243', 'E0-P-244', 'E0-P-247', 'E0-P-248', 'E0-P-249', 'E0-P-250', 'E0-P-251', 'E0-P-252',
      'E0-P-254', 'E0-P-255', 'E0-P-262', 'E0-P-266', 'E0-P-269'
    ]) }),
  Object.freeze({ id: 'pnj/l09', parent: 'pnj', label: 'L09 — Temple of Spite',
    profiles: Object.freeze([
      'E0-P-341', 'E0-P-342', 'E0-P-343', 'E0-P-344', 'E0-P-345', 'E0-P-346', 'E0-P-348', 'E0-P-349',
      'E0-P-350', 'E0-P-351', 'E0-P-352', 'E0-P-353', 'E0-P-354', 'E0-P-355', 'E0-P-356', 'E0-P-357',
      'E0-P-358', 'E0-P-359', 'E0-P-360', 'E0-P-361', 'E0-P-362', 'E0-P-363'
    ]) }),
  Object.freeze({ id: 'pnj/l10', parent: 'pnj', label: 'L10 — Sylvania, The Cursed County',
    profiles: Object.freeze([
      'E0-P-364', 'E0-P-365', 'E0-P-366', 'E0-P-367', 'E0-P-368', 'E0-P-370', 'E0-P-372', 'E0-P-376',
      'E0-P-377', 'E0-P-378', 'E0-P-379', 'E0-P-380', 'E0-P-381', 'E0-P-382', 'E0-P-383', 'E0-P-384',
      'E0-P-385', 'E0-P-386', 'E0-P-387', 'E0-P-388', 'E0-P-389', 'E0-P-390', 'E0-P-391', 'E0-P-392'
    ]) }),
  Object.freeze({ id: 'pnj/l11', parent: 'pnj', label: 'L11 — The Imperial Zoo',
    profiles: Object.freeze([
      'E0-P-002', 'E0-P-008', 'E0-P-010', 'E0-P-014', 'E0-P-018', 'E0-P-020', 'E0-P-028', 'E0-P-034',
      'E0-P-040', 'E0-P-043', 'E0-P-047', 'E0-P-055', 'E0-P-059'
    ]) }),
  Object.freeze({ id: 'pnj/l12', parent: 'pnj', label: 'L12 — Tribes and Tribulations',
    profiles: Object.freeze([
      'E0-P-418', 'E0-P-419', 'E0-P-420', 'E0-P-421', 'E0-P-422', 'E0-P-423', 'E0-P-424', 'E0-P-425',
      'E0-P-426', 'E0-P-427', 'E0-P-428', 'E0-P-429', 'E0-P-430', 'E0-P-431', 'E0-P-432', 'E0-P-433',
      'E0-P-434', 'E0-P-435', 'E0-P-436', 'E0-P-437', 'E0-P-438', 'E0-P-439', 'E0-P-440', 'E0-P-441',
      'E0-P-450', 'E0-P-451', 'E0-P-453', 'E0-P-454', 'E0-P-455', 'E0-P-456'
    ]) }),
  Object.freeze({ id: 'pnj/l13', parent: 'pnj', label: 'L13 — Up in Arms',
    profiles: Object.freeze([
      'E0-P-462'
    ]) }),
  Object.freeze({ id: 'pnj/l14', parent: 'pnj', label: 'L14 — Sea Wardens of Cothique',
    profiles: Object.freeze([
      'E0-P-472', 'E0-P-475', 'E0-P-476', 'E0-P-477', 'E0-P-479', 'E0-P-480', 'E0-P-481', 'E0-P-482',
      'E0-P-483', 'E0-P-484', 'E0-P-485', 'E0-P-486'
    ]) }),
  Object.freeze({ id: 'pnj/l16', parent: 'pnj', label: 'L16 — Lords of Stone and Steel',
    profiles: Object.freeze([
      'E0-P-492', 'E0-P-493', 'E0-P-494', 'E0-P-495', 'E0-P-496', 'E0-P-497', 'E0-P-498', 'E0-P-499',
      'E0-P-500', 'E0-P-501', 'E0-P-502', 'E0-P-503', 'E0-P-504', 'E0-P-505', 'E0-P-508', 'E0-P-510',
      'E0-P-514'
    ]) }),
  Object.freeze({ id: 'pnj/l17', parent: 'pnj', label: 'L17 — Winds of Magic',
    profiles: Object.freeze([
      'E0-P-516', 'E0-P-517', 'E0-P-518', 'E0-P-519', 'E0-P-520', 'E0-P-521', 'E0-P-522', 'E0-P-523',
      'E0-P-531', 'E0-P-532', 'E0-P-533', 'E0-P-535'
    ]) }),
  Object.freeze({ id: 'pnj/l18', parent: 'pnj', label: 'L18 — Power Behind the Throne Companion',
    profiles: Object.freeze([
      'E0-P-542', 'E0-P-543', 'E0-P-544', 'E0-P-545', 'E0-P-546', 'E0-P-547', 'E0-P-548', 'E0-P-549',
      'E0-P-550', 'E0-P-552', 'E0-P-553', 'E0-P-558', 'E0-P-560', 'E0-P-561', 'E0-P-564', 'E0-P-574'
    ]) }),
  Object.freeze({ id: 'pnj/l19', parent: 'pnj', label: 'L19 — Middenheim: City of the White Wolf',
    profiles: Object.freeze([
      'E0-P-572', 'E0-P-573', 'E0-P-575', 'E0-P-576', 'E0-P-577', 'E0-P-578', 'E0-P-579', 'E0-P-580',
      'E0-P-581', 'E0-P-582', 'E0-P-583', 'E0-P-584', 'E0-P-585', 'E0-P-586', 'E0-P-587', 'E0-P-588',
      'E0-P-589', 'E0-P-590', 'E0-P-591', 'E0-P-592', 'E0-P-593', 'E0-P-594', 'E0-P-595', 'E0-P-596',
      'E0-P-597', 'E0-P-601', 'E0-P-602', 'E0-P-603', 'E0-P-604', 'E0-P-608', 'E0-P-609', 'E0-P-610',
      'E0-P-611'
    ]) }),
  Object.freeze({ id: 'pnj/l20', parent: 'pnj', label: 'L20 — Altdorf: Crown of the Empire',
    profiles: Object.freeze([
      'E0-P-613', 'E0-P-614', 'E0-P-615', 'E0-P-616', 'E0-P-617', 'E0-P-618', 'E0-P-619', 'E0-P-620',
      'E0-P-621', 'E0-P-622', 'E0-P-623', 'E0-P-624', 'E0-P-625', 'E0-P-626', 'E0-P-627', 'E0-P-628',
      'E0-P-629', 'E0-P-630', 'E0-P-631', 'E0-P-632', 'E0-P-633', 'E0-P-634', 'E0-P-635', 'E0-P-636',
      'E0-P-637', 'E0-P-638', 'E0-P-639', 'E0-P-640', 'E0-P-641', 'E0-P-642', 'E0-P-643', 'E0-P-644',
      'E0-P-645', 'E0-P-646', 'E0-P-647', 'E0-P-648', 'E0-P-649', 'E0-P-650', 'E0-P-651', 'E0-P-652',
      'E0-P-653', 'E0-P-654', 'E0-P-655', 'E0-P-656'
    ]) }),
  Object.freeze({ id: 'pnj/l21', parent: 'pnj', label: 'L21 — Empire in Ruins Companion',
    profiles: Object.freeze([
      'E0-P-658', 'E0-P-659', 'E0-P-660', 'E0-P-661', 'E0-P-662', 'E0-P-663', 'E0-P-675', 'E0-P-676',
      'E0-P-678', 'E0-P-679', 'E0-P-680', 'E0-P-681', 'E0-P-682', 'E0-P-683', 'E0-P-684', 'E0-P-686',
      'E0-P-688', 'E0-P-694', 'E0-P-695', 'E0-P-696', 'E0-P-697', 'E0-P-698', 'E0-P-699', 'E0-P-700',
      'E0-P-703', 'E0-P-705', 'E0-P-706', 'E0-P-709', 'E0-P-710', 'E0-P-711'
    ]) }),
  Object.freeze({ id: 'pnj/l22', parent: 'pnj', label: 'L22 — The Horned Rat Companion',
    profiles: Object.freeze([
      'E0-P-716', 'E0-P-717', 'E0-P-719', 'E0-P-722', 'E0-P-724', 'E0-P-727', 'E0-P-728', 'E0-P-729',
      'E0-P-738', 'E0-P-740', 'E0-P-741', 'E0-P-746', 'E0-P-747', 'E0-P-748', 'E0-P-749', 'E0-P-751',
      'E0-P-753', 'E0-P-754'
    ]) }),
  Object.freeze({ id: 'pnj/l23', parent: 'pnj', label: 'L23 — Enemy in Shadows Companion',
    profiles: Object.freeze([
      'E0-P-767', 'E0-P-768', 'E0-P-769', 'E0-P-770', 'E0-P-771', 'E0-P-772', 'E0-P-773', 'E0-P-774',
      'E0-P-775', 'E0-P-776', 'E0-P-777', 'E0-P-778', 'E0-P-779', 'E0-P-780', 'E0-P-781', 'E0-P-782',
      'E0-P-783', 'E0-P-784', 'E0-P-785', 'E0-P-786', 'E0-P-787', 'E0-P-791', 'E0-P-793', 'E0-P-794',
      'E0-P-795', 'E0-P-796', 'E0-P-797', 'E0-P-799', 'E0-P-802', 'E0-P-803', 'E0-P-805', 'E0-P-806',
      'E0-P-808', 'E0-P-809', 'E0-P-810', 'E0-P-811', 'E0-P-812', 'E0-P-813'
    ]) }),
  Object.freeze({ id: 'pnj/l24', parent: 'pnj', label: 'L24 — Rough Nights & Hard Days',
    profiles: Object.freeze([
      'E0-P-814', 'E0-P-815', 'E0-P-816', 'E0-P-818', 'E0-P-820', 'E0-P-821', 'E0-P-822', 'E0-P-823',
      'E0-P-824', 'E0-P-825', 'E0-P-826', 'E0-P-827', 'E0-P-829', 'E0-P-831', 'E0-P-832', 'E0-P-834',
      'E0-P-835', 'E0-P-839', 'E0-P-842', 'E0-P-844', 'E0-P-845', 'E0-P-852', 'E0-P-853', 'E0-P-854',
      'E0-P-856', 'E0-P-858', 'E0-P-860', 'E0-P-866', 'E0-P-867', 'E0-P-868', 'E0-P-869', 'E0-P-871',
      'E0-P-872', 'E0-P-873', 'E0-P-874', 'E0-P-875', 'E0-P-876', 'E0-P-877', 'E0-P-878', 'E0-P-879',
      'E0-P-880', 'E0-P-881', 'E0-P-882', 'E0-P-883', 'E0-P-884', 'E0-P-885', 'E0-P-886', 'E0-P-887',
      'E0-P-888', 'E0-P-889', 'E0-P-890', 'E0-P-891', 'E0-P-892', 'E0-P-893'
    ]) }),
  Object.freeze({ id: 'pnj/l25', parent: 'pnj', label: 'L25 — Sea of Claws',
    profiles: Object.freeze([
      'E0-P-895', 'E0-P-896', 'E0-P-897', 'E0-P-898', 'E0-P-919', 'E0-P-920', 'E0-P-921', 'E0-P-922'
    ]) }),
  Object.freeze({ id: 'pnj/l26', parent: 'pnj', label: 'L26 — Death on the Reik Companion',
    profiles: Object.freeze([
      'E0-P-923', 'E0-P-924', 'E0-P-925', 'E0-P-927', 'E0-P-928', 'E0-P-929', 'E0-P-930', 'E0-P-931',
      'E0-P-932', 'E0-P-933', 'E0-P-934', 'E0-P-935', 'E0-P-936', 'E0-P-937', 'E0-P-938', 'E0-P-939',
      'E0-P-940', 'E0-P-941', 'E0-P-942', 'E0-P-943', 'E0-P-944', 'E0-P-945', 'E0-P-946', 'E0-P-947',
      'E0-P-948', 'E0-P-949', 'E0-P-950', 'E0-P-951', 'E0-P-952', 'E0-P-954', 'E0-P-955', 'E0-P-956',
      'E0-P-957', 'E0-P-964', 'E0-P-965', 'E0-P-966', 'E0-P-968', 'E0-P-972', 'E0-P-973', 'E0-P-982',
      'E0-P-983'
    ]) }),
  Object.freeze({ id: 'pnj/l28', parent: 'pnj', label: 'L28 — Le Pouvoir derrière le Trône (Ennemi Intérieur 3)',
    profiles: Object.freeze([
      'E0-P-1000', 'E0-P-1001', 'E0-P-1003', 'E0-P-1004', 'E0-P-1005', 'E0-P-1006', 'E0-P-1007', 'E0-P-1008',
      'E0-P-1009', 'E0-P-1010', 'E0-P-1011', 'E0-P-1013', 'E0-P-1014', 'E0-P-1016', 'E0-P-1017', 'E0-P-1018',
      'E0-P-1019', 'E0-P-1020', 'E0-P-1021', 'E0-P-1022', 'E0-P-1023', 'E0-P-1024', 'E0-P-1025', 'E0-P-1026',
      'E0-P-1027', 'E0-P-1028', 'E0-P-1029', 'E0-P-1030', 'E0-P-1032', 'E0-P-1033', 'E0-P-1034', 'E0-P-1035',
      'E0-P-1036', 'E0-P-1037', 'E0-P-1038', 'E0-P-1039', 'E0-P-1040', 'E0-P-1041', 'E0-P-1042', 'E0-P-1043',
      'E0-P-1044', 'E0-P-1045', 'E0-P-1046', 'E0-P-1047', 'E0-P-1048', 'E0-P-1049', 'E0-P-1050', 'E0-P-1051',
      'E0-P-1052', 'E0-P-1053', 'E0-P-1054', 'E0-P-992', 'E0-P-993', 'E0-P-994', 'E0-P-995', 'E0-P-996',
      'E0-P-999', 'E0-P-1061', 'E0-P-1062', 'E0-P-1063', 'E0-P-1064', 'E0-P-1065', 'E0-P-1066', 'E0-P-1067'
    ]) }),
  Object.freeze({ id: 'pnj/l29', parent: 'pnj', label: 'L29 — Le Tome de la Corruption (WJDR V2, converti en V5)',
    profiles: Object.freeze([
      'E0-P-1068', 'E0-P-1069', 'E0-P-1070', 'E0-P-1090', 'E0-P-1113'
    ]) }),
  Object.freeze({ id: 'pnj/l30', parent: 'pnj', label: 'L30 — Le Seigneur liche (WJDR V2, converti en V5)',
    profiles: Object.freeze([
      'E0-P-1118', 'E0-P-1119', 'E0-P-1120', 'E0-P-1121', 'E0-P-1122', 'E0-P-1123', 'E0-P-1124'
    ]) }),
  Object.freeze({ id: 'pj', parent: null, label: 'PJ prétirés',
    profiles: Object.freeze([
      'E0-P-536', 'E0-P-537', 'E0-P-538', 'E0-P-539', 'E0-P-540', 'E0-P-541'
    ]) }),
  Object.freeze({ id: 'gabarits', parent: null, label: 'Gabarits',
    profiles: Object.freeze([
      'E0-P-112', 'E0-P-113', 'E0-P-114', 'E0-P-115', 'E0-P-116', 'E0-P-117', 'E0-P-118', 'E0-P-326',
      'E0-P-327', 'E0-P-328', 'E0-P-329', 'E0-P-330', 'E0-P-331', 'E0-P-332', 'E0-P-333', 'E0-P-334',
      'E0-P-335', 'E0-P-336', 'E0-P-337', 'E0-P-338', 'E0-P-339', 'E0-P-340', 'E0-P-404', 'E0-P-405',
      'E0-P-406', 'E0-P-408', 'E0-P-409', 'E0-P-410', 'E0-P-411', 'E0-P-442', 'E0-P-443', 'E0-P-444',
      'E0-P-445', 'E0-P-446', 'E0-P-447', 'E0-P-448', 'E0-P-449', 'E0-P-466', 'E0-P-467', 'E0-P-468',
      'E0-P-469', 'E0-P-470', 'E0-P-471', 'E0-P-598'
    ]) })
]);
