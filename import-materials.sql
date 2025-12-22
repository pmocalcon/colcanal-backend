-- ================================================
-- Script de importación de materiales
-- Generado: 2025-12-03T16:46:17.222Z
-- Total materiales: 358
-- Total grupos: 10
-- ================================================

-- IMPORTANTE: Este script usa la categoría con ID 1 (Pendiente) por defecto
-- Si necesitas otra categoría, cambia el valor de @default_category_id

BEGIN;

-- ================================================
-- 1. CREAR GRUPOS QUE NO EXISTAN
-- ================================================

INSERT INTO material_groups (name, category_id)
SELECT 'LUMINARIAS Y PROYECTORES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('LUMINARIAS Y PROYECTORES'));

INSERT INTO material_groups (name, category_id)
SELECT 'CONDUCTORES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('CONDUCTORES'));

INSERT INTO material_groups (name, category_id)
SELECT 'HERRAJES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('HERRAJES'));

INSERT INTO material_groups (name, category_id)
SELECT 'CONECTORES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('CONECTORES'));

INSERT INTO material_groups (name, category_id)
SELECT 'PROTECCIONES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('PROTECCIONES'));

INSERT INTO material_groups (name, category_id)
SELECT 'ELECTRÓNICO', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('ELECTRÓNICO'));

INSERT INTO material_groups (name, category_id)
SELECT 'POSTES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('POSTES'));

INSERT INTO material_groups (name, category_id)
SELECT 'TRANSFORMADORES', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('TRANSFORMADORES'));

INSERT INTO material_groups (name, category_id)
SELECT 'ACCESORIOS', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('ACCESORIOS'));

INSERT INTO material_groups (name, category_id)
SELECT 'BOMBILLAS', 1
WHERE NOT EXISTS (SELECT 1 FROM material_groups WHERE UPPER(name) = UPPER('BOMBILLAS'));

-- ================================================
-- 2. INSERTAR MATERIALES (omite duplicados por código)
-- ================================================

INSERT INTO materials (code, description, group_id)
SELECT '3000', 'LUMINARIA LED DE 28W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3000');

INSERT INTO materials (code, description, group_id)
SELECT '3001', 'LUMINARIA LED DE 30W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3001');

INSERT INTO materials (code, description, group_id)
SELECT '3002', 'LUMINARIA LED DE 31W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3002');

INSERT INTO materials (code, description, group_id)
SELECT '3003', 'LUMINARIA LED DE 35W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3003');

INSERT INTO materials (code, description, group_id)
SELECT '3004', 'LUMINARIA LED DE 37W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3004');

INSERT INTO materials (code, description, group_id)
SELECT '3005', 'LUMINARIA LED DE 38W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3005');

INSERT INTO materials (code, description, group_id)
SELECT '3006', 'LUMINARIA LED DE 39W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3006');

INSERT INTO materials (code, description, group_id)
SELECT '3007', 'LUMINARIA LED DE 40W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3007');

INSERT INTO materials (code, description, group_id)
SELECT '3008', 'LUMINARIA LED DE 41W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3008');

INSERT INTO materials (code, description, group_id)
SELECT '3009', 'LUMINARIA LED DE 42W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3009');

INSERT INTO materials (code, description, group_id)
SELECT '3010', 'LUMINARIA LED DE 44W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3010');

INSERT INTO materials (code, description, group_id)
SELECT '3011', 'LUMINARIA LED DE 50W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3011');

INSERT INTO materials (code, description, group_id)
SELECT '3012', 'LUMINARIA LED DE 56W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3012');

INSERT INTO materials (code, description, group_id)
SELECT '3013', 'LUMINARIA LED DE 60W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3013');

INSERT INTO materials (code, description, group_id)
SELECT '3014', 'LUMINARIA LED DE 62W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3014');

INSERT INTO materials (code, description, group_id)
SELECT '3015', 'LUMINARIA LED DE 63.2W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3015');

INSERT INTO materials (code, description, group_id)
SELECT '3016', 'LUMINARIA LED DE 65W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3016');

INSERT INTO materials (code, description, group_id)
SELECT '3017', 'LUMINARIA LED DE 67W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3017');

INSERT INTO materials (code, description, group_id)
SELECT '3018', 'LUMINARIA LED DE 72W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3018');

INSERT INTO materials (code, description, group_id)
SELECT '3019', 'LUMINARIA LED DE 73W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3019');

INSERT INTO materials (code, description, group_id)
SELECT '3020', 'LUMINARIA LED DE 74W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3020');

INSERT INTO materials (code, description, group_id)
SELECT '3021', 'LUMINARIA LED DE 80W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3021');

INSERT INTO materials (code, description, group_id)
SELECT '3022', 'LUMINARIA LED DE 90W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3022');

INSERT INTO materials (code, description, group_id)
SELECT '3023', 'LUMINARIA LED DE 91W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3023');

INSERT INTO materials (code, description, group_id)
SELECT '3024', 'LUMINARIA LED DE 94W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3024');

INSERT INTO materials (code, description, group_id)
SELECT '3025', 'LUMINARIA LED DE 100W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3025');

INSERT INTO materials (code, description, group_id)
SELECT '3026', 'LUMINARIA LED DE 110W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3026');

INSERT INTO materials (code, description, group_id)
SELECT '3027', 'LUMINARIA LED DE 120W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3027');

INSERT INTO materials (code, description, group_id)
SELECT '3028', 'LUMINARIA LED DE 130W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3028');

INSERT INTO materials (code, description, group_id)
SELECT '3029', 'LUMINARIA LED DE 150W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3029');

INSERT INTO materials (code, description, group_id)
SELECT '3030', 'LUMINARIA LED DE 160W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3030');

INSERT INTO materials (code, description, group_id)
SELECT '3031', 'LUMINARIA LED DE 173W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3031');

INSERT INTO materials (code, description, group_id)
SELECT '3032', 'LUMINARIA LED DE 200W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3032');

INSERT INTO materials (code, description, group_id)
SELECT '3033', 'LUMINARIA LED DE 230W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3033');

INSERT INTO materials (code, description, group_id)
SELECT '3034', 'LUMINARIA LED DE 400W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3034');

INSERT INTO materials (code, description, group_id)
SELECT '3035', 'PROYECTOR LED DE 50W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3035');

INSERT INTO materials (code, description, group_id)
SELECT '3036', 'PROYECTOR LED DE 70W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3036');

INSERT INTO materials (code, description, group_id)
SELECT '3037', 'PROYECTOR LED DE 74W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3037');

INSERT INTO materials (code, description, group_id)
SELECT '3038', 'PROYECTOR LED DE 80W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3038');

INSERT INTO materials (code, description, group_id)
SELECT '3039', 'PROYECTOR LED DE 90W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3039');

INSERT INTO materials (code, description, group_id)
SELECT '3040', 'PROYECTOR LED DE 100W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3040');

INSERT INTO materials (code, description, group_id)
SELECT '3041', 'PROYECTOR LED DE 130W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3041');

INSERT INTO materials (code, description, group_id)
SELECT '3042', 'PROYECTOR LED DE 140W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3042');

INSERT INTO materials (code, description, group_id)
SELECT '3043', 'PROYECTOR LED DE 146W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3043');

INSERT INTO materials (code, description, group_id)
SELECT '3044', 'PROYECTOR LED DE 150W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3044');

INSERT INTO materials (code, description, group_id)
SELECT '3045', 'PROYECTOR LED DE 160W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3045');

INSERT INTO materials (code, description, group_id)
SELECT '3046', 'PROYECTOR LED DE 200W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3046');

INSERT INTO materials (code, description, group_id)
SELECT '3047', 'PROYECTOR LED DE 205W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3047');

INSERT INTO materials (code, description, group_id)
SELECT '3048', 'LUMINARIA DECORATIVA LED DE 26W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3048');

INSERT INTO materials (code, description, group_id)
SELECT '3049', 'LUMINARIA DECORATIVA LED DE 35W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3049');

INSERT INTO materials (code, description, group_id)
SELECT '3050', 'LUMINARIA DECORATIVA LED DE 40W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3050');

INSERT INTO materials (code, description, group_id)
SELECT '3051', 'LUMINARIA DECORATIVA LED DE 42W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3051');

INSERT INTO materials (code, description, group_id)
SELECT '3052', 'LUMINARIA SOLAR LED DE 40W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3052');

INSERT INTO materials (code, description, group_id)
SELECT '3053', 'LUMINARIA SOLAR LED DE 60W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('LUMINARIAS Y PROYECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3053');

INSERT INTO materials (code, description, group_id)
SELECT '3100', 'ALAMBRE AISLADO 12 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3100');

INSERT INTO materials (code, description, group_id)
SELECT '3101', 'ALAMBRE AISLADO 14 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3101');

INSERT INTO materials (code, description, group_id)
SELECT '3102', 'CABLE AISLADO 10 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3102');

INSERT INTO materials (code, description, group_id)
SELECT '3103', 'CABLE AISLADO 12 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3103');

INSERT INTO materials (code, description, group_id)
SELECT '3104', 'CABLE AISLADO 14 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3104');

INSERT INTO materials (code, description, group_id)
SELECT '3105', 'CABLE AISLADO 2 AWG Al', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3105');

INSERT INTO materials (code, description, group_id)
SELECT '3106', 'CABLE AISLADO 2 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3106');

INSERT INTO materials (code, description, group_id)
SELECT '3107', 'CABLE AISLADO 4 AWG Al', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3107');

INSERT INTO materials (code, description, group_id)
SELECT '3108', 'CABLE AISLADO 4 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3108');

INSERT INTO materials (code, description, group_id)
SELECT '3109', 'CABLE AISLADO 6 AWG Al', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3109');

INSERT INTO materials (code, description, group_id)
SELECT '3110', 'CABLE AISLADO 6 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3110');

INSERT INTO materials (code, description, group_id)
SELECT '3111', 'CABLE AISLADO 8 AWG Al', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3111');

INSERT INTO materials (code, description, group_id)
SELECT '3112', 'CABLE AISLADO 8 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3112');

INSERT INTO materials (code, description, group_id)
SELECT '3113', 'CABLE DE ACCERO GALVANIZADO 1/4''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3113');

INSERT INTO materials (code, description, group_id)
SELECT '3114', 'CABLE DUPLEX 2x16 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3114');

INSERT INTO materials (code, description, group_id)
SELECT '3115', 'CABLE DUPLEX 2x14 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3115');

INSERT INTO materials (code, description, group_id)
SELECT '3116', 'CABLE DUPLEX 2x12 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3116');

INSERT INTO materials (code, description, group_id)
SELECT '3117', 'CABLE ENCAUCHETADO 2x14 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3117');

INSERT INTO materials (code, description, group_id)
SELECT '3118', 'CABLE ENCAUCHETADO 2x16 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3118');

INSERT INTO materials (code, description, group_id)
SELECT '3119', 'CABLE ENCAUCHETADO 3x14 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3119');

INSERT INTO materials (code, description, group_id)
SELECT '3120', 'CABLE ENCAUCHETADO 3x16 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3120');

INSERT INTO materials (code, description, group_id)
SELECT '3121', 'CABLE SILICONADO 12 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3121');

INSERT INTO materials (code, description, group_id)
SELECT '3122', 'CABLE TRIPLEX 2x4+4 AWG Al', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3122');

INSERT INTO materials (code, description, group_id)
SELECT '3123', 'CABLE TSEC 2x6+6 AWG Al', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3123');

INSERT INTO materials (code, description, group_id)
SELECT '3124', 'CABLE TSEC 2x8+8 AWG Cu', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3124');

INSERT INTO materials (code, description, group_id)
SELECT '3125', 'AISLADOR TENSOR DE 4 CUARTO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3125');

INSERT INTO materials (code, description, group_id)
SELECT '3126', 'CABLE DE ACERO SUPER GX DE 1/4', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3126');

INSERT INTO materials (code, description, group_id)
SELECT '3127', 'CABLE DE RETENIDA GX 1/4', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONDUCTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3127');

INSERT INTO materials (code, description, group_id)
SELECT '3200', 'COLLARIN GRILLETE 3-4'''' T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3200');

INSERT INTO materials (code, description, group_id)
SELECT '3201', 'COLLARIN GRILLETE 4-5'''' T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3201');

INSERT INTO materials (code, description, group_id)
SELECT '3202', 'COLLARIN GRILLETE 4-5'''' T1/2 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3202');

INSERT INTO materials (code, description, group_id)
SELECT '3203', 'COLLARIN GRILLETE 4-5'''' T5/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3203');

INSERT INTO materials (code, description, group_id)
SELECT '3204', 'COLLARIN GRILLETE 5-6'''' T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3204');

INSERT INTO materials (code, description, group_id)
SELECT '3205', 'COLLARIN GRILLETE 5-6'''' T1/2 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3205');

INSERT INTO materials (code, description, group_id)
SELECT '3206', 'COLLARIN GRILLETE 5-6'''' T5/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3206');

INSERT INTO materials (code, description, group_id)
SELECT '3207', 'COLLARIN GRILLETE 7-8'''' T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3207');

INSERT INTO materials (code, description, group_id)
SELECT '3208', 'COLLARIN GRILLETE 7-8'''' T1/2 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3208');

INSERT INTO materials (code, description, group_id)
SELECT '3209', 'COLLARIN GRILLETE 7-8'''' T5/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3209');

INSERT INTO materials (code, description, group_id)
SELECT '3210', 'COLLARIN GRILLETE 9-10'''' T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3210');

INSERT INTO materials (code, description, group_id)
SELECT '3211', 'COLLARIN GRILLETE 9-10'''' T1/2 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3211');

INSERT INTO materials (code, description, group_id)
SELECT '3212', 'COLLARIN GRILLETE 9-10'''' T5/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3212');

INSERT INTO materials (code, description, group_id)
SELECT '3213', 'COLLARIN 1 SALIDA 3-4'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3213');

INSERT INTO materials (code, description, group_id)
SELECT '3214', 'COLLARIN 1 SALIDA 5-6'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3214');

INSERT INTO materials (code, description, group_id)
SELECT '3215', 'COLLARIN 1 SALIDA 7-8'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3215');

INSERT INTO materials (code, description, group_id)
SELECT '3216', 'COLLARIN 1 SALIDA 9-10'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3216');

INSERT INTO materials (code, description, group_id)
SELECT '3217', 'COLLARIN 2 SALIDAS 5-6'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3217');

INSERT INTO materials (code, description, group_id)
SELECT '3218', 'COLLARIN 2 SALIDAS 7-8'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3218');

INSERT INTO materials (code, description, group_id)
SELECT '3219', 'COLLARIN 2 SALIDAS 9-10'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3219');

INSERT INTO materials (code, description, group_id)
SELECT '3220', 'CARA COLLARIN CIEGO 3-4'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3220');

INSERT INTO materials (code, description, group_id)
SELECT '3221', 'CARA COLLARIN CIEGO 5-6'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3221');

INSERT INTO materials (code, description, group_id)
SELECT '3222', 'CARA COLLARIN CIEGO 7-8'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3222');

INSERT INTO materials (code, description, group_id)
SELECT '3223', 'CARA COLLARIN CIEGO 9-10'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3223');

INSERT INTO materials (code, description, group_id)
SELECT '3224', 'CARA COLLARIN GRILLETE 3-4'''' T3/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3224');

INSERT INTO materials (code, description, group_id)
SELECT '3225', 'CARA COLLARIN GRILLETE 5-6'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3225');

INSERT INTO materials (code, description, group_id)
SELECT '3226', 'CARA COLLARIN GRILLETE 7-8'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3226');

INSERT INTO materials (code, description, group_id)
SELECT '3227', 'CARA COLLARIN GRILLETE 9-10'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3227');

INSERT INTO materials (code, description, group_id)
SELECT '3228', 'GRILLETE T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3228');

INSERT INTO materials (code, description, group_id)
SELECT '3229', 'GRILLETE T1/2 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3229');

INSERT INTO materials (code, description, group_id)
SELECT '3230', 'GRILLETE T5/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3230');

INSERT INTO materials (code, description, group_id)
SELECT '3231', 'BRAZO2DOBLESAVAN0,35MALT0,4MD1 1/4''''C14 0°', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3231');

INSERT INTO materials (code, description, group_id)
SELECT '3232', 'BRAZO2DOBLESAVAN0,5MALT0,75MD1 1/4''''C1410°', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3232');

INSERT INTO materials (code, description, group_id)
SELECT '3233', 'BRAZO2DOBLESAVAN1,5MALT1MD11/4''''C14 0°', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3233');

INSERT INTO materials (code, description, group_id)
SELECT '3234', 'BRAZO FACHADA AVAN1MALT1M D1 1/4'''' C14 0°', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3234');

INSERT INTO materials (code, description, group_id)
SELECT '3235', 'BRAZO EN L AVAN 1M D 1 1/4'''' C14 0°', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3235');

INSERT INTO materials (code, description, group_id)
SELECT '3236', 'BRAZO PARA PROYECTOR', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3236');

INSERT INTO materials (code, description, group_id)
SELECT '3237', 'PERCHA DE 1 PUESTO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3237');

INSERT INTO materials (code, description, group_id)
SELECT '3238', 'CINTA BANDI 3/4''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3238');

INSERT INTO materials (code, description, group_id)
SELECT '3239', 'CINTA BANDI 1/2''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3239');

INSERT INTO materials (code, description, group_id)
SELECT '3240', 'HEBILLA 3/4''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3240');

INSERT INTO materials (code, description, group_id)
SELECT '3241', 'HEBILLA 1/2''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3241');

INSERT INTO materials (code, description, group_id)
SELECT '3242', 'TUERCA 3/8''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3242');

INSERT INTO materials (code, description, group_id)
SELECT '3243', 'TUERCA 5/8''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3243');

INSERT INTO materials (code, description, group_id)
SELECT '3244', 'CRUCETA METÁLICA GALV. 1/4'''' x 3'''' x 2M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3244');

INSERT INTO materials (code, description, group_id)
SELECT '3245', 'CRUCETA METÁLICA GALV. 1/4'''' x 3'''' x 2.4M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3245');

INSERT INTO materials (code, description, group_id)
SELECT '3246', 'ANGULAR', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3246');

INSERT INTO materials (code, description, group_id)
SELECT '3247', 'VARILLA ROSCADA GALV. DE 3/8'''' x 1M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3247');

INSERT INTO materials (code, description, group_id)
SELECT '3248', 'VARILLA ROSCADA GALV. DE 3/8'''' x 3M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3248');

INSERT INTO materials (code, description, group_id)
SELECT '3249', 'VARILLA ROSCADA GALV. DE 5/8'''' x 1M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3249');

INSERT INTO materials (code, description, group_id)
SELECT '3250', 'VARILLA ROSCADA GALV. DE 5/8'''' x 3M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3250');

INSERT INTO materials (code, description, group_id)
SELECT '3251', 'VARILLA PARA ANCLAJE 5/8" x 1.8M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3251');

INSERT INTO materials (code, description, group_id)
SELECT '3252', 'GUARDA CABLE 1/4"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3252');

INSERT INTO materials (code, description, group_id)
SELECT '3253', 'ARANDELA CUADRADA 5"x 5" x 1/4"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3253');

INSERT INTO materials (code, description, group_id)
SELECT '3254', 'ARANDELA 3/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3254');

INSERT INTO materials (code, description, group_id)
SELECT '3255', 'TORNILLO HEXAGONAL GALV 1/2 X 1', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3255');

INSERT INTO materials (code, description, group_id)
SELECT '3256', 'TUERCAS GALVANIZADAS 3/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3256');

INSERT INTO materials (code, description, group_id)
SELECT '3257', 'TUERCAS GALVANIZADAS 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3257');

INSERT INTO materials (code, description, group_id)
SELECT '3258', 'CINTA BANDI 5/8''''', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3258');

INSERT INTO materials (code, description, group_id)
SELECT '3259', 'COLLARIN 1 SALIDA 6-7'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3259');

INSERT INTO materials (code, description, group_id)
SELECT '3260', 'BRAZO GALV/LAMP 1 1 1/2" x 1.25 MT', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3260');

INSERT INTO materials (code, description, group_id)
SELECT '3261', 'BRAZO GALVANIZADO 1 1/4" x 1.5Mt CAL 14', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3261');

INSERT INTO materials (code, description, group_id)
SELECT '3262', 'BRAZO GALVANIZADO 1 1/4" x 1.95Mt CAL 14', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3262');

INSERT INTO materials (code, description, group_id)
SELECT '3263', 'VARILLA COPERWEL COBRE 5/8 x 2.40 MTS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3263');

INSERT INTO materials (code, description, group_id)
SELECT '3264', 'COLLARIN GRILLETE DE 6" - 7"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3264');

INSERT INTO materials (code, description, group_id)
SELECT '3265', 'HEBILLA 5/8"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3265');

INSERT INTO materials (code, description, group_id)
SELECT '3266', 'UNION C GALV EMT 1"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3266');

INSERT INTO materials (code, description, group_id)
SELECT '3267', 'BRAZO METALICO DE 1 1/4 X 1.10 MTS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3267');

INSERT INTO materials (code, description, group_id)
SELECT '3268', 'TUBO PVC 1"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3268');

INSERT INTO materials (code, description, group_id)
SELECT '3269', 'TUBO GALVANIZADO EMT 3/4"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3269');

INSERT INTO materials (code, description, group_id)
SELECT '3270', 'TERMINAL EMT 3/4', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3270');

INSERT INTO materials (code, description, group_id)
SELECT '3271', 'ARANDELA 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3271');

INSERT INTO materials (code, description, group_id)
SELECT '3272', 'CRUCETA METALICA GALV. 1.5MX2 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3272');

INSERT INTO materials (code, description, group_id)
SELECT '3273', 'COLLARIN 1 SALIDA 4-5'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3273');

INSERT INTO materials (code, description, group_id)
SELECT '3274', 'ARANDELA 5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3274');

INSERT INTO materials (code, description, group_id)
SELECT '3275', 'BRAZO EN L AVAN 1.3 M D 1 1/4'''' C14 0°', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3275');

INSERT INTO materials (code, description, group_id)
SELECT '3276', 'GRAPA GALVANIZADA 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3276');

INSERT INTO materials (code, description, group_id)
SELECT '3277', 'ARANDELA CUADRADA 4X4 PARA ZAPATA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3277');

INSERT INTO materials (code, description, group_id)
SELECT '3278', 'BRAZO RL-C PARA REFLECTOR', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3278');

INSERT INTO materials (code, description, group_id)
SELECT '3279', 'CINTA BANDI 3/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3279');

INSERT INTO materials (code, description, group_id)
SELECT '3280', 'BRAZO FACHADA 1 1/4" 1.6 MT', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3280');

INSERT INTO materials (code, description, group_id)
SELECT '3281', 'BRAZO GALVANIZADO DE 1 1/2" X 2.5 MTS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3281');

INSERT INTO materials (code, description, group_id)
SELECT '3282', 'COLLARIN GRILLETE 6-7'''' T3/8 U1 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3282');

INSERT INTO materials (code, description, group_id)
SELECT '3283', 'COLLARIN 1 SALIDA 6-7'''' T5/8', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3283');

INSERT INTO materials (code, description, group_id)
SELECT '3284', 'HEBILLA 3/8"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3284');

INSERT INTO materials (code, description, group_id)
SELECT '3285', 'BRAZO GALV/LAMP 1 1 1/2" x 1.50 mts', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3285');

INSERT INTO materials (code, description, group_id)
SELECT '3286', 'BRAZO GALV/LAMP 1 1 1/2" x 2 mts CAL 14', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3286');

INSERT INTO materials (code, description, group_id)
SELECT '3287', 'BRAZO RL-C PARA REFLECTOR', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3287');

INSERT INTO materials (code, description, group_id)
SELECT '3288', 'BRAZO SENCILLO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3288');

INSERT INTO materials (code, description, group_id)
SELECT '3289', 'DIAGONAL RECTA CRUCETA GALV 68cm', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3289');

INSERT INTO materials (code, description, group_id)
SELECT '3290', 'PERNO ANCLAJE DE 5x8 60', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3290');

INSERT INTO materials (code, description, group_id)
SELECT '3291', 'PERNO CARRUAJE GALV T 5/8 "', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3291');

INSERT INTO materials (code, description, group_id)
SELECT '3292', 'PLANTILLA ANCLAJE 30x30', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3292');

INSERT INTO materials (code, description, group_id)
SELECT '3293', 'TORNILLO CARRUAJE 5/8" X 1 1/2" PARA LAS 2 SALIDAS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3293');

INSERT INTO materials (code, description, group_id)
SELECT '3294', 'TORNILLO DE ACERO GALV. 5/8" X 2"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3294');

INSERT INTO materials (code, description, group_id)
SELECT '3295', 'TUBO COND GALV IMC 1"+UNION PYTCO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3295');

INSERT INTO materials (code, description, group_id)
SELECT '3296', 'TUBO CONDUIT IMC 11 2x3 MTS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3296');

INSERT INTO materials (code, description, group_id)
SELECT '3297', 'TUBO EMT 1/2 PULGADAS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3297');

INSERT INTO materials (code, description, group_id)
SELECT '3298', 'ZAPATA DE CONCRETO 40 x 40 CM', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('HERRAJES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3298');

INSERT INTO materials (code, description, group_id)
SELECT '3300', 'CONECTOR 2 POLOS WAGO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3300');

INSERT INTO materials (code, description, group_id)
SELECT '3301', 'CONECTOR 3 POLOS WAGO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3301');

INSERT INTO materials (code, description, group_id)
SELECT '3302', 'CONECTOR 4 POLOS WAGO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3302');

INSERT INTO materials (code, description, group_id)
SELECT '3303', 'CONECTOR AP-1', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3303');

INSERT INTO materials (code, description, group_id)
SELECT '3304', 'CONECTOR AP-2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3304');

INSERT INTO materials (code, description, group_id)
SELECT '3305', 'CONECTOR CDP-150 (8-300 , 12-2)', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3305');

INSERT INTO materials (code, description, group_id)
SELECT '3306', 'CONECTOR CDP-70 (8-3/0 , 16-8)', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3306');

INSERT INTO materials (code, description, group_id)
SELECT '3307', 'CONECTOR PRENSA ESTOPA DE 3/4', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3307');

INSERT INTO materials (code, description, group_id)
SELECT '3308', 'CONECTOR PRENSA ESTOPA DE 1/2', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3308');

INSERT INTO materials (code, description, group_id)
SELECT '3309', 'EMPALME EN GEL 6-2 AWG 14-8AWG', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3309');

INSERT INTO materials (code, description, group_id)
SELECT '3310', 'REGLETA PLÁSTICA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3310');

INSERT INTO materials (code, description, group_id)
SELECT '3311', 'PRENSA ESTOPA DE 1"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3311');

INSERT INTO materials (code, description, group_id)
SELECT '3312', 'CONECTOR CDP 120 (4-300)', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3312');

INSERT INTO materials (code, description, group_id)
SELECT '3313', 'CONECTOR PALANCA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3313');

INSERT INTO materials (code, description, group_id)
SELECT '3314', 'CONECTOR BIMETALICO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3314');

INSERT INTO materials (code, description, group_id)
SELECT '3315', 'CONECTOR DE PERFORACION DE 95', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3315');

INSERT INTO materials (code, description, group_id)
SELECT '3316', 'BORNA TERMINAL CU #8 1H', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3316');

INSERT INTO materials (code, description, group_id)
SELECT '3317', 'CONECTOR 5 POLOS WAGO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('CONECTORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3317');

INSERT INTO materials (code, description, group_id)
SELECT '3400', 'BREAKER 1x60A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3400');

INSERT INTO materials (code, description, group_id)
SELECT '3401', 'CONECTOR VARILLA SPT', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3401');

INSERT INTO materials (code, description, group_id)
SELECT '3402', 'DPS 10kV', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3402');

INSERT INTO materials (code, description, group_id)
SELECT '3403', 'FUSIBLE DE ACCIÓN 6A x 500V', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3403');

INSERT INTO materials (code, description, group_id)
SELECT '3404', 'FUSIBLE DE VIDRIO 5A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3404');

INSERT INTO materials (code, description, group_id)
SELECT '3405', 'HILO FUSIBLE 1A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3405');

INSERT INTO materials (code, description, group_id)
SELECT '3406', 'HILO FUSIBLE 2A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3406');

INSERT INTO materials (code, description, group_id)
SELECT '3407', 'HILO FUSIBLE 3A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3407');

INSERT INTO materials (code, description, group_id)
SELECT '3408', 'KIT PUESTA A TIERRA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3408');

INSERT INTO materials (code, description, group_id)
SELECT '3409', 'MINIBREAKER 14A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3409');

INSERT INTO materials (code, description, group_id)
SELECT '3410', 'PARARRAYO 15 KV', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3410');

INSERT INTO materials (code, description, group_id)
SELECT '3411', 'VARILLA PUESTA A TIERRA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3411');

INSERT INTO materials (code, description, group_id)
SELECT '3412', 'VARISTOR DE 391V', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3412');

INSERT INTO materials (code, description, group_id)
SELECT '3413', 'BREAKER 25KA 3x100A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3413');

INSERT INTO materials (code, description, group_id)
SELECT '3414', 'CONTACTOR 3 POLO 32A 220V', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3414');

INSERT INTO materials (code, description, group_id)
SELECT '3415', 'AISLADOR TIPO CARRETO DE PORCELANA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3415');

INSERT INTO materials (code, description, group_id)
SELECT '3416', 'AISLADOR TENSOR AT-1', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3416');

INSERT INTO materials (code, description, group_id)
SELECT '3417', 'PORTAFUSIBLE PEQUEÑO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3417');

INSERT INTO materials (code, description, group_id)
SELECT '3418', 'FUSIBLE 6.3 A 5*20', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3418');

INSERT INTO materials (code, description, group_id)
SELECT '3419', 'BREAKER 2 x 40 AMP', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3419');

INSERT INTO materials (code, description, group_id)
SELECT '3420', 'BREAKER 20A', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3420');

INSERT INTO materials (code, description, group_id)
SELECT '3421', 'BREAKER DE 2X20 AMP', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3421');

INSERT INTO materials (code, description, group_id)
SELECT '3422', 'BREAKER MG RIEL MULTI 9', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3422');

INSERT INTO materials (code, description, group_id)
SELECT '3423', 'CONTACTOR TE 3P 110 VTE', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3423');

INSERT INTO materials (code, description, group_id)
SELECT '3424', 'PORTAFUSIBLE DE ACCION RAPIDA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('PROTECCIONES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3424');

INSERT INTO materials (code, description, group_id)
SELECT '3500', 'DRIVER DE 28W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3500');

INSERT INTO materials (code, description, group_id)
SELECT '3501', 'DRIVER DE 30W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3501');

INSERT INTO materials (code, description, group_id)
SELECT '3502', 'DRIVER DE 31W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3502');

INSERT INTO materials (code, description, group_id)
SELECT '3503', 'DRIVER DE 35W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3503');

INSERT INTO materials (code, description, group_id)
SELECT '3504', 'DRIVER DE 37W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3504');

INSERT INTO materials (code, description, group_id)
SELECT '3505', 'DRIVER DE 38W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3505');

INSERT INTO materials (code, description, group_id)
SELECT '3506', 'DRIVER DE 39W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3506');

INSERT INTO materials (code, description, group_id)
SELECT '3507', 'DRIVER DE 40W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3507');

INSERT INTO materials (code, description, group_id)
SELECT '3508', 'DRIVER DE 41W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3508');

INSERT INTO materials (code, description, group_id)
SELECT '3509', 'DRIVER DE 42W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3509');

INSERT INTO materials (code, description, group_id)
SELECT '3510', 'DRIVER DE 44W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3510');

INSERT INTO materials (code, description, group_id)
SELECT '3511', 'DRIVER DE 50W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3511');

INSERT INTO materials (code, description, group_id)
SELECT '3512', 'DRIVER DE 56W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3512');

INSERT INTO materials (code, description, group_id)
SELECT '3513', 'DRIVER DE 60W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3513');

INSERT INTO materials (code, description, group_id)
SELECT '3514', 'DRIVER DE 62W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3514');

INSERT INTO materials (code, description, group_id)
SELECT '3515', 'DRIVER DE 63.2W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3515');

INSERT INTO materials (code, description, group_id)
SELECT '3516', 'DRIVER DE 65W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3516');

INSERT INTO materials (code, description, group_id)
SELECT '3517', 'DRIVER DE 67W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3517');

INSERT INTO materials (code, description, group_id)
SELECT '3518', 'DRIVER DE 72W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3518');

INSERT INTO materials (code, description, group_id)
SELECT '3519', 'DRIVER DE 73W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3519');

INSERT INTO materials (code, description, group_id)
SELECT '3520', 'DRIVER DE 74W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3520');

INSERT INTO materials (code, description, group_id)
SELECT '3521', 'DRIVER DE 80W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3521');

INSERT INTO materials (code, description, group_id)
SELECT '3522', 'DRIVER DE 90W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3522');

INSERT INTO materials (code, description, group_id)
SELECT '3523', 'DRIVER DE 91W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3523');

INSERT INTO materials (code, description, group_id)
SELECT '3524', 'DRIVER DE 94W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3524');

INSERT INTO materials (code, description, group_id)
SELECT '3525', 'DRIVER DE 100W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3525');

INSERT INTO materials (code, description, group_id)
SELECT '3526', 'DRIVER DE 110W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3526');

INSERT INTO materials (code, description, group_id)
SELECT '3527', 'DRIVER DE 120W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3527');

INSERT INTO materials (code, description, group_id)
SELECT '3528', 'DRIVER DE 130W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3528');

INSERT INTO materials (code, description, group_id)
SELECT '3529', 'DRIVER DE 140W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3529');

INSERT INTO materials (code, description, group_id)
SELECT '3530', 'DRIVER DE 146W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3530');

INSERT INTO materials (code, description, group_id)
SELECT '3531', 'DRIVER DE 150W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3531');

INSERT INTO materials (code, description, group_id)
SELECT '3532', 'DRIVER DE 160W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3532');

INSERT INTO materials (code, description, group_id)
SELECT '3533', 'DRIVER DE 200W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3533');

INSERT INTO materials (code, description, group_id)
SELECT '3534', 'DRIVER DE 205W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3534');

INSERT INTO materials (code, description, group_id)
SELECT '3535', 'DRIVER DE 250W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3535');

INSERT INTO materials (code, description, group_id)
SELECT '3536', 'FOTOCELDA IP64', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3536');

INSERT INTO materials (code, description, group_id)
SELECT '3537', 'FOTOCELDA IP65', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3537');

INSERT INTO materials (code, description, group_id)
SELECT '3538', 'FOTOCELDA IP66', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3538');

INSERT INTO materials (code, description, group_id)
SELECT '3539', 'FOTOCELDA TELEGESTIÓN (ESCLAVO)', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3539');

INSERT INTO materials (code, description, group_id)
SELECT '3540', 'FOTOCELDA TELEGESTIÓN (MAESTRO)', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3540');

INSERT INTO materials (code, description, group_id)
SELECT '3541', 'PROGRAMADOR SEM 240VAC (TIMER)', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3541');

INSERT INTO materials (code, description, group_id)
SELECT '3542', 'PCBA 65W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3542');

INSERT INTO materials (code, description, group_id)
SELECT '3543', 'SOCKET E-40', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3543');

INSERT INTO materials (code, description, group_id)
SELECT '3544', 'BASE FOTOCELDA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3544');

INSERT INTO materials (code, description, group_id)
SELECT '3545', 'PCBA 56W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3545');

INSERT INTO materials (code, description, group_id)
SELECT '3546', 'PCBA 80W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3546');

INSERT INTO materials (code, description, group_id)
SELECT '3547', 'DRIVER DE 180W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3547');

INSERT INTO materials (code, description, group_id)
SELECT '3548', 'SOCKET E-27', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3548');

INSERT INTO materials (code, description, group_id)
SELECT '3549', 'DRIVER DE 212W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3549');

INSERT INTO materials (code, description, group_id)
SELECT '3550', 'DRIVER DE 240W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3550');

INSERT INTO materials (code, description, group_id)
SELECT '3551', 'PCBA 212W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3551');

INSERT INTO materials (code, description, group_id)
SELECT '3552', 'PCBA 35W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3552');

INSERT INTO materials (code, description, group_id)
SELECT '3553', 'PCBA DE AXIA SCH', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ELECTRÓNICO')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3553');

INSERT INTO materials (code, description, group_id)
SELECT '3600', 'POSTE EN CONCRETO DE 8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3600');

INSERT INTO materials (code, description, group_id)
SELECT '3601', 'POSTE EN CONCRETO DE 9x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3601');

INSERT INTO materials (code, description, group_id)
SELECT '3602', 'POSTE EN CONCRETO DE 10x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3602');

INSERT INTO materials (code, description, group_id)
SELECT '3603', 'POSTE EN CONCRETO DE 11x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3603');

INSERT INTO materials (code, description, group_id)
SELECT '3604', 'POSTE EN CONCRETO DE 12x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3604');

INSERT INTO materials (code, description, group_id)
SELECT '3605', 'POSTE EN CONCRETO DE 14x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3605');

INSERT INTO materials (code, description, group_id)
SELECT '3606', 'POSTE EN CONCRETO DE 16x750', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3606');

INSERT INTO materials (code, description, group_id)
SELECT '3607', 'POSTE METÁLICO SECCIONADO DE 8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3607');

INSERT INTO materials (code, description, group_id)
SELECT '3608', 'POSTE METÁLICO SECCIONADO DE 9x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3608');

INSERT INTO materials (code, description, group_id)
SELECT '3609', 'POSTE METÁLICO SECCIONADO DE 10x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3609');

INSERT INTO materials (code, description, group_id)
SELECT '3610', 'POSTE METÁLICO SECCIONADO DE 12x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3610');

INSERT INTO materials (code, description, group_id)
SELECT '3611', 'POSTE METÁLICO SECCIONADO DE 14x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3611');

INSERT INTO materials (code, description, group_id)
SELECT '3612', 'POSTE METÁLICO SECCIONADO DE 16x750', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3612');

INSERT INTO materials (code, description, group_id)
SELECT '3613', 'POSTE METÁLICO MONOLÍTICO DE 7x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3613');

INSERT INTO materials (code, description, group_id)
SELECT '3614', 'POSTE METÁLICO MONOLÍTICO DE 8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3614');

INSERT INTO materials (code, description, group_id)
SELECT '3615', 'POSTEMETÁLICOMONOCONFLANCHEPERNOSDE7x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3615');

INSERT INTO materials (code, description, group_id)
SELECT '3616', 'POSTEMETÁLICOMONOCONFLANCHEPERNOS DE8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3616');

INSERT INTO materials (code, description, group_id)
SELECT '3617', 'POSTEMETÁLICOSECC CONFLANCHEPERNOSDE8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3617');

INSERT INTO materials (code, description, group_id)
SELECT '3618', 'POSTEMETÁLICO SECCFLANCHE PERNOS 9x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3618');

INSERT INTO materials (code, description, group_id)
SELECT '3619', 'POSTE EN FIBRA DE VIDRIO SECCIONADO DE 8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3619');

INSERT INTO materials (code, description, group_id)
SELECT '3620', 'POSTE EN FIBRA DE VIDRIO SECCIONADO DE 9x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3620');

INSERT INTO materials (code, description, group_id)
SELECT '3621', 'POSTE EN FIBRA DE VIDRIO SECCIONADO DE 10x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3621');

INSERT INTO materials (code, description, group_id)
SELECT '3622', 'POSTE EN FIBRA DE VIDRIO SECCIONADO DE 12x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3622');

INSERT INTO materials (code, description, group_id)
SELECT '3623', 'POSTE EN FIBRA DE VIDRIO SECCIONADO DE 14x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3623');

INSERT INTO materials (code, description, group_id)
SELECT '3624', 'POSTE EN FIBRA DE VIDRIO MONOLÍTICO DE 8x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3624');

INSERT INTO materials (code, description, group_id)
SELECT '3625', 'POSTE EN FIBRA DE VIDRIO MONOLÍTICO DE 9x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3625');

INSERT INTO materials (code, description, group_id)
SELECT '3626', 'POSTE EN FIBRA DE VIDRIO MONOLÍTICO DE 10x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3626');

INSERT INTO materials (code, description, group_id)
SELECT '3627', 'POSTE EN FIBRA DE VIDRIO MONOLÍTICO DE 12x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3627');

INSERT INTO materials (code, description, group_id)
SELECT '3628', 'POSTE EN FIBRA DE VIDRIO MONOLÍTICO DE 14x510', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3628');

INSERT INTO materials (code, description, group_id)
SELECT '3629', 'POSTE CON SOPORTE PARA 1 FAROL', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3629');

INSERT INTO materials (code, description, group_id)
SELECT '3630', 'POSTE CON SOPORTE PARA 2 FAROLES', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3630');

INSERT INTO materials (code, description, group_id)
SELECT '3631', 'POSTE METALICO DE 5.0M + FLANCHE', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('POSTES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3631');

INSERT INTO materials (code, description, group_id)
SELECT '3700', 'TRANSFORMADOR MONOFÁSICO DE 10KVA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('TRANSFORMADORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3700');

INSERT INTO materials (code, description, group_id)
SELECT '3701', 'TRANSFORMADOR MONOFÁSICO DE 15KVA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('TRANSFORMADORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3701');

INSERT INTO materials (code, description, group_id)
SELECT '3702', 'TRANSFORMADOR MONOFÁSICO DE 25KVA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('TRANSFORMADORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3702');

INSERT INTO materials (code, description, group_id)
SELECT '3703', 'TRANSFORMADOR MONOFÁSICO DE 50KVA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('TRANSFORMADORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3703');

INSERT INTO materials (code, description, group_id)
SELECT '3704', 'TRANSFORMADOR TRIFÁSICO DE 75KVA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('TRANSFORMADORES')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3704');

INSERT INTO materials (code, description, group_id)
SELECT '3800', 'TAPA LUMINARIA ALURBAN S', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3800');

INSERT INTO materials (code, description, group_id)
SELECT '3801', 'TAPA LUMINARIA ALURBAN M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3801');

INSERT INTO materials (code, description, group_id)
SELECT '3802', 'TAPA LUMINARIA ALURBAN L', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3802');

INSERT INTO materials (code, description, group_id)
SELECT '3803', 'VIDRIO LUMINARIA ALURBAN S', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3803');

INSERT INTO materials (code, description, group_id)
SELECT '3804', 'VIDRIO LUMINARIA ALURBAN M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3804');

INSERT INTO materials (code, description, group_id)
SELECT '3805', 'VIDRIO LUMINARIA ALURBAN L', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3805');

INSERT INTO materials (code, description, group_id)
SELECT '3806', 'VIDRIO PROYECTOR AVIOR', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3806');

INSERT INTO materials (code, description, group_id)
SELECT '3807', 'ACOPLE PARA LUMINARIA ALURBAN', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3807');

INSERT INTO materials (code, description, group_id)
SELECT '3808', 'CAJA DE PASO 30x30x15 CM', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3808');

INSERT INTO materials (code, description, group_id)
SELECT '3809', 'ETIQUETA POTENCIA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3809');

INSERT INTO materials (code, description, group_id)
SELECT '3810', 'ETIQUETA SERIE', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3810');

INSERT INTO materials (code, description, group_id)
SELECT '3811', 'CAUCHOS CARCAZA LUMINARIA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3811');

INSERT INTO materials (code, description, group_id)
SELECT '3812', 'CINTA AISLANTE No. 33', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3812');

INSERT INTO materials (code, description, group_id)
SELECT '3813', 'CINTA AUTOFUNDENTE SCOTCH 23', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3813');

INSERT INTO materials (code, description, group_id)
SELECT '3814', 'FUNDA TERMO ENCOGIBLE CALIBRE 16', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3814');

INSERT INTO materials (code, description, group_id)
SELECT '3815', 'PRENSA PARA TERMINALES', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3815');

INSERT INTO materials (code, description, group_id)
SELECT '3816', 'STICKER SERIE', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3816');

INSERT INTO materials (code, description, group_id)
SELECT '3817', 'STIKCER POTENCIA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3817');

INSERT INTO materials (code, description, group_id)
SELECT '3818', 'TOMA DOBLE', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3818');

INSERT INTO materials (code, description, group_id)
SELECT '3819', 'RIEL CHANEL 2X4 TROQUELADO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3819');

INSERT INTO materials (code, description, group_id)
SELECT '3820', 'CAJA RAWELT EN ALUMINIO DE 4 SALIDAS 3/4', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3820');

INSERT INTO materials (code, description, group_id)
SELECT '3821', 'ACOPLE METALICO CILINDRICO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3821');

INSERT INTO materials (code, description, group_id)
SELECT '3822', 'CAJA DE CONTADOR', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3822');

INSERT INTO materials (code, description, group_id)
SELECT '3823', 'BOQUILLA TERMINAL PARA TUBERIA 1"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3823');

INSERT INTO materials (code, description, group_id)
SELECT '3824', 'CURVA PVC 1" 1/2"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3824');

INSERT INTO materials (code, description, group_id)
SELECT '3825', 'ZAPATA DE CONCRETO 40 x 40 CM', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3825');

INSERT INTO materials (code, description, group_id)
SELECT '3826', 'EMPAQUE BASE DE FOTOCELDA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3826');

INSERT INTO materials (code, description, group_id)
SELECT '3827', 'EMPAQUE PARA LUMINARIA TALLA M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3827');

INSERT INTO materials (code, description, group_id)
SELECT '3828', 'EMPAQUE PARA LUMINARIA TALLA S', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3828');

INSERT INTO materials (code, description, group_id)
SELECT '3829', 'PANTALLA DECORATIVA LUMINARIA TALLA M', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3829');

INSERT INTO materials (code, description, group_id)
SELECT '3830', 'PANTALLA DECORATIVA LUMINARIA TALLA S', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3830');

INSERT INTO materials (code, description, group_id)
SELECT '3831', 'BOMBONA LED P25 EN VIDRIO', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3831');

INSERT INTO materials (code, description, group_id)
SELECT '3832', 'ADAPTADOR TUBERIA VERDE', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3832');

INSERT INTO materials (code, description, group_id)
SELECT '3833', 'AMARRAS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3833');

INSERT INTO materials (code, description, group_id)
SELECT '3834', 'CAJA DERIVACION 10x10x5 DEXSON', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3834');

INSERT INTO materials (code, description, group_id)
SELECT '3835', 'CURVA PVC 1" 1/2"', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3835');

INSERT INTO materials (code, description, group_id)
SELECT '3836', 'CURVAS PVC 3/4 PULGADAS', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3836');

INSERT INTO materials (code, description, group_id)
SELECT '3837', 'BLOQUE RETENIDA', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('ACCESORIOS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3837');

INSERT INTO materials (code, description, group_id)
SELECT '3900', 'BOMBILLA LED 15W E-27', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('BOMBILLAS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3900');

INSERT INTO materials (code, description, group_id)
SELECT '3901', 'BOMBILLA LED 20W E-27', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('BOMBILLAS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3901');

INSERT INTO materials (code, description, group_id)
SELECT '3902', 'BOMBILLA LED 30W E-27', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('BOMBILLAS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3902');

INSERT INTO materials (code, description, group_id)
SELECT '3903', 'BOMBILLO AHORRADOR 9W', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('BOMBILLAS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3903');

INSERT INTO materials (code, description, group_id)
SELECT '3904', 'BOMBILLO LED CONVECIONAL E-27', g.group_id
FROM material_groups g
WHERE UPPER(g.name) = UPPER('BOMBILLAS')
  AND NOT EXISTS (SELECT 1 FROM materials WHERE code = '3904');

COMMIT;

-- ================================================
-- 3. VERIFICAR RESULTADOS
-- ================================================
SELECT 'Grupos totales:' as info, COUNT(*) as total FROM material_groups;
SELECT 'Materiales totales:' as info, COUNT(*) as total FROM materials;
SELECT g.name as grupo, COUNT(m.material_id) as materiales
FROM material_groups g
LEFT JOIN materials m ON g.group_id = m.group_id
GROUP BY g.name
ORDER BY g.name;
