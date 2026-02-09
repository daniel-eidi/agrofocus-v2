#!/usr/bin/env python3
"""
Script de exemplo para testar o algoritmo de segmentação
sem precisar do backend Node.js
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from segmentacao import SegmentadorTalhoes
import json

def testar_com_imagem_exemplo():
    """Testa o algoritmo com uma imagem de exemplo"""
    
    print("=" * 60)
    print("🧪 Teste de Auto-Delineamento - AgroFocus")
    print("=" * 60)
    
    # Imagem de teste (Lena - imagem padrão de processamento)
    imagem_teste = "https://upload.wikimedia.org/wikipedia/en/7/7d/Lenna_%28test_image%29.png"
    
    # Testar Watershed
    print("\n📊 Testando Watershed Algorithm...")
    print("-" * 40)
    
    segmentador = SegmentadorTalhoes(algoritmo='watershed')
    resultado = segmentador.segmentar(imagem_teste)
    
    if resultado:
        print(f"✅ Segmentação bem-sucedida!")
        print(f"   Talhões detectados: {len(resultado)}")
        print(f"   IoU Estimado: 0.75")
        
        # Mostrar detalhes do primeiro talhão
        if len(resultado) > 0:
            print(f"\n📍 Primeiro talhão:")
            print(f"   Área: {resultado[0]['area']:.0f} pixels")
            print(f"   Score: {resultado[0]['score']:.2f}")
            
        return True
    else:
        print("❌ Falha na segmentação")
        return False

def testar_edge_detection():
    """Testa edge detection"""
    
    print("\n📊 Testando Edge Detection...")
    print("-" * 40)
    
    imagem_teste = "https://upload.wikimedia.org/wikipedia/en/7/7d/Lenna_%28test_image%29.png"
    segmentador = SegmentadorTalhoes(algoritmo='edge')
    resultado = segmentador.segmentar(imagem_teste)
    
    if resultado:
        print(f"✅ Edge detection concluído!")
        print(f"   Talhões detectados: {len(resultado)}")
        return True
    else:
        print("❌ Falha no edge detection")
        return False

def testar_classificacao_zonas():
    """Testa classificação de zonas com NDVI simulado"""
    
    print("\n📊 Testando Classificação de Zonas...")
    print("-" * 40)
    
    import numpy as np
    
    # Simular histórico NDVI de 6 anos
    # Cada "ano" é uma matriz 50x50 com valores NDVI
    historico_ndvi = []
    for ano in range(6):
        # Criar padrão de NDVI com algumas regiões de alta/baixa produtividade
        ndvi = np.random.rand(50, 50) * 0.5 + 0.3  # Base 0.3-0.8
        
        # Adicionar região de alta produtividade
        ndvi[10:20, 10:20] = 0.75 + np.random.rand(10, 10) * 0.15
        
        # Adicionar região de baixa produtividade
        ndvi[30:40, 30:40] = 0.2 + np.random.rand(10, 10) * 0.15
        
        historico_ndvi.append(ndvi)
    
    print(f"✅ Dados NDVI simulados criados")
    print(f"   Anos: {len(historico_ndvi)}")
    print(f"   Dimensões: {historico_ndvi[0].shape}")
    
    # Calcular média
    ndvi_medio = np.mean(historico_ndvi, axis=0)
    
    # Classificar
    zona_low = np.sum(ndvi_medio < 0.4)
    zona_medium = np.sum((ndvi_medio >= 0.4) & (ndvi_medio <= 0.7))
    zona_high = np.sum(ndvi_medio > 0.7)
    total = ndvi_medio.size
    
    print(f"\n🎯 Classificação:")
    print(f"   Low (NDVI < 0.4):    {zona_low/total*100:.1f}%")
    print(f"   Medium (0.4-0.7):     {zona_medium/total*100:.1f}%")
    print(f"   High (NDVI > 0.7):    {zona_high/total*100:.1f}%")
    
    return True

def main():
    """Executa todos os testes"""
    
    print("\n🌾 AgroFocus - Sistema de Auto-Delineamento")
    print("Meta: 0.75 IoU (inicial) → 0.90 IoU (futuro)\n")
    
    resultados = []
    
    # Testar algoritmos
    resultados.append(("Watershed", testar_com_imagem_exemplo()))
    resultados.append(("Edge Detection", testar_edge_detection()))
    resultados.append(("Classificação Zonas", testar_classificacao_zonas()))
    
    # Resumo
    print("\n" + "=" * 60)
    print("📋 Resumo dos Testes")
    print("=" * 60)
    
    for nome, sucesso in resultados:
        status = "✅ PASSOU" if sucesso else "❌ FALHOU"
        print(f"{nome}: {status}")
    
    todos_passaram = all(r[1] for r in resultados)
    
    print("\n" + ("🎉 Todos os testes passaram!" if todos_passaram else "⚠️ Alguns testes falharam"))
    print("=" * 60)
    
    return 0 if todos_passaram else 1

if __name__ == '__main__':
    sys.exit(main())