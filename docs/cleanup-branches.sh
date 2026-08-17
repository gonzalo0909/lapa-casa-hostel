#!/bin/bash
# Lapa Casa Hostel — Branch Cleanup Phase 2
# Ejecutar en: gonzalo0909/lapa-casa-hostel
# Fecha: 2026-08-17
#
# PRERREQUISITOS:
#   - Ejecutar desde tu máquina local (requiere permisos de owner)
#   - Las ramas archived/* ya fueron creadas en GitHub (Fase 1 completada)
#   - Este script solo borra las ramas originales
#
# USO: bash docs/cleanup-branches.sh

set -e

echo "🌿 Lapa Casa Hostel — Branch Cleanup Phase 2"
echo "================================================"
echo "Borrando 33 ramas originales (ya archivadas en archived/*)"
echo ""

# ── ELIMINAR (0 commits únicos vs main) ─────────────────────────
echo "🗑️  Eliminando rama sin valor..."
git push origin --delete claude/motorreservas-apartamentos-analisis-soyfii
echo ""

# ── MOTORES BASE ────────────────────────────────────────────────
echo "📦 Borrando motores base (archivados en archived/motor-*)..."
git push origin --delete Motorreservasapartamentos
git push origin --delete Motorreservashostel
git push origin --delete apartamentos
git push origin --delete motorreservalapartamentosapagon
echo ""

# ── CANALES DEPRECADOS ──────────────────────────────────────────
echo "📦 Borrando canales deprecados (archivados en archived/channel-*)..."
git push origin --delete channel-manager1008
git push origin --delete channel1008
git push origin --delete channelapartamentos
git push origin --delete channelbackend
git push origin --delete channelhostel
echo ""

# ── FIXES DE APARTAMENTOS (ya en main) ─────────────────────────
echo "📦 Borrando fixes de apartamentos (archivados en archived/fix-apt-*)..."
git push origin --delete claude/fix-apartment-arrival-time-format
git push origin --delete claude/fix-apartment-property-type
git push origin --delete claude/fix-apartments-payment-expiry-v2
git push origin --delete claude/fix-apartments-phone-ddd55-v2
echo ""

# ── FIXES DE HOMEPAGE (ya en main) ─────────────────────────────
echo "📦 Borrando fixes de homepage (archivados en archived/fix-home-*)..."
git push origin --delete claude/front-homepage-analysis-itaz67
git push origin --delete claude/homepage-booking-engines-bmpg8p
git push origin --delete claude/personal-perturbation-r7ix16
echo ""

# ── ANÁLISIS CLAUDE (workbench one-shot) ───────────────────────
echo "📦 Borrando ramas de análisis Claude (archivadas en archived/claude-*)..."
git push origin --delete claude/ai-agents-work-zqb3ix
git push origin --delete claude/analisis-motores-reservas-c62ppd
git push origin --delete claude/apartment-booking-engine-p6jx7n
git push origin --delete claude/artefacto-esquema-explicativo-n5hkmw
git push origin --delete claude/auditoria-mrh1408-lyxbdp
git push origin --delete claude/channel-manager-analysis-jdngge
git push origin --delete claude/escaneo-trabajo-realizado-a542nl
git push origin --delete claude/esquema-explicativo-n2jlpy
git push origin --delete claude/hostel-booking-engine-ld40jx
git push origin --delete claude/lapa-casa-hostel-site-q0dayy
git push origin --delete claude/motor-reservas-problemas-1wwmnv
git push origin --delete claude/multiple-agents-claude-code-4j6ptr
git push origin --delete claude/ventana-5-9kc5f8
echo ""

# ── FEATURES ANTIGUAS Y SNAPSHOTS DUPLICADOS ───────────────────
echo "📦 Borrando features antiguas y snapshots duplicados..."
git push origin --delete ventana-1
git push origin --delete 09082026
git push origin --delete auditoria-09082026
echo ""

echo "================================================"
echo "✅ Limpieza completada."
echo ""
echo "RESULTADO FINAL:"
echo "  Activas:   12 ramas (MrH1408, hostel, backups, referencias)"
echo "  Archivadas: 32 ramas (archived/* — accesibles pero sin ruido)"
echo "  Eliminadas:  1 rama (sin valor)"
echo "  Total visible: 13 ramas + main"
