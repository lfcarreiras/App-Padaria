import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { Carrinha, ClienteEmpresarialB2B, DiaSemana } from '../../types';

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#1f2937',
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: 'black',
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 8,
    color: '#4b5563',
    marginTop: 2,
  },
  badge: {
    backgroundColor: '#111827',
    color: '#ffffff',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    alignSelf: 'flex-end',
  },
  grid: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 6,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  gridCol: {
    flex: 1,
  },
  label: {
    fontSize: 7,
    color: '#6b7280',
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  val: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 2,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold',
  },
  col1: { flex: 3 },
  col2: { flex: 1, textAlign: 'center' },
  col3: { flex: 1, textAlign: 'right' },
  col4: { flex: 1, textAlign: 'right' },
  signatureSection: {
    marginTop: 25,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: {
    width: '45%',
    textAlign: 'center',
    paddingTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
  },
});

export interface FolhaCargaProps {
  carrinha: Carrinha;
  dataFormatada: string;
  itens: { nome: string; quantidade: number; caixasEstimadas: number }[];
  totalUnidades: number;
  totalCaixas: number;
}

export const FolhaDeCargaPdfDocument = ({
  carrinha,
  dataFormatada,
  itens,
  totalUnidades,
  totalCaixas,
}: FolhaCargaProps) => (
  <Document title={`Folha_Carga_${carrinha.rota || 'Rota'}_${dataFormatada}`}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Padaria da Vila</Text>
          <Text style={styles.subtitle}>Fabrico Próprio de Pão e Pastelaria • Arouca</Text>
          <Text style={styles.subtitle}>Centro de Expedição e Logística da Madrugada</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.badge}>Guia de Carga de Expedição</Text>
          <Text style={[styles.subtitle, { marginTop: 4 }]}>Data: {dataFormatada}</Text>
          <Text style={styles.subtitle}>Turno da Madrugada (04h00 – 06h00)</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={styles.gridCol}>
          <Text style={styles.label}>Rota Operacional</Text>
          <Text style={[styles.val, { color: '#1e3a8a' }]}>{carrinha.rota || carrinha.identificador}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.label}>Viatura</Text>
          <Text style={styles.val}>{carrinha.nome_carro || 'Viatura Padaria'}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.label}>Matrícula</Text>
          <Text style={styles.val}>{carrinha.matricula}</Text>
        </View>
        <View style={styles.gridCol}>
          <Text style={styles.label}>Condutor</Text>
          <Text style={styles.val}>{carrinha.nome_condutor || 'Motorista'}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <Text style={styles.col1}>Artigo / Produto</Text>
          <Text style={styles.col3}>Quantidade</Text>
          <Text style={styles.col4}>Caixas</Text>
        </View>
        {itens.map((item, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.col1}>{item.nome}</Text>
            <Text style={styles.col3}>{item.quantidade} un.</Text>
            <Text style={styles.col4}>{item.caixasEstimadas} cx</Text>
          </View>
        ))}
        <View style={[styles.tableRow, { backgroundColor: '#f9fafb', fontWeight: 'bold' }]}>
          <Text style={styles.col1}>TOTAL CARREGADO</Text>
          <Text style={styles.col3}>{totalUnidades} un.</Text>
          <Text style={styles.col4}>{totalCaixas} cx</Text>
        </View>
      </View>

      <View style={styles.signatureSection}>
        <View style={styles.signBox}>
          <Text style={{ fontSize: 8 }}>Visto do Chefe de Fabrico / Expedição</Text>
        </View>
        <View style={styles.signBox}>
          <Text style={{ fontSize: 8 }}>Assinatura do Motorista da Rota</Text>
        </View>
      </View>
    </Page>
  </Document>
);

export interface ComprovativoB2BProps {
  cliente: ClienteEmpresarialB2B;
  carrinha: Carrinha;
  dataFormatada: string;
  horaFormatada: string;
  itens: { nome: string; quantidade: number }[];
  totalUnidades: number;
  nomeRecebedor?: string;
}

export const ComprovativoB2BPdfDocument = ({
  cliente,
  carrinha,
  dataFormatada,
  horaFormatada,
  itens,
  totalUnidades,
  nomeRecebedor,
}: ComprovativoB2BProps) => (
  <Document title={`Comprovativo_B2B_${cliente.nome}_${dataFormatada}`}>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Padaria da Vila</Text>
          <Text style={styles.subtitle}>Matriz: Rua Principal de Arouca • NIF: 509 123 456</Text>
          <Text style={styles.subtitle}>Tel: 256 940 000 • Email: encomendas@padariadavila.pt</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.badge, { backgroundColor: '#312e81' }]}>Comprovativo de Entrega B2B</Text>
          <Text style={[styles.subtitle, { marginTop: 4 }]}>Data: {dataFormatada} às {horaFormatada}</Text>
        </View>
      </View>

      <View style={styles.grid}>
        <View style={{ flex: 2 }}>
          <Text style={styles.label}>Entidade Destinatária</Text>
          <Text style={[styles.val, { fontSize: 11 }]}>{cliente.nome}</Text>
          <Text style={styles.subtitle}>NIF: {cliente.nif || 'Consumidor Final'}</Text>
          <Text style={styles.subtitle}>Morada: {cliente.morada}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Rota & Transporte</Text>
          <Text style={styles.val}>{carrinha.rota || 'Rota'}</Text>
          <Text style={styles.subtitle}>Matrícula: {carrinha.matricula}</Text>
          <Text style={styles.subtitle}>Condutor: {carrinha.nome_condutor}</Text>
        </View>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, { backgroundColor: '#312e81', color: '#ffffff' }]}>
          <Text style={[styles.col1, { color: '#ffffff', fontWeight: 'bold' }]}>Artigo / Produto</Text>
          <Text style={[styles.col3, { color: '#ffffff', fontWeight: 'bold' }]}>Quantidade</Text>
          <Text style={[styles.col4, { color: '#ffffff', fontWeight: 'bold' }]}>Conformidade</Text>
        </View>
        {itens.map((it, idx) => (
          <View key={idx} style={styles.tableRow}>
            <Text style={styles.col1}>{it.nome}</Text>
            <Text style={styles.col3}>{it.quantidade} un.</Text>
            <Text style={[styles.col4, { color: '#047857' }]}>Conforme</Text>
          </View>
        ))}
        <View style={[styles.tableRow, { backgroundColor: '#f9fafb', fontWeight: 'bold' }]}>
          <Text style={styles.col1}>TOTAL ENTREGUE</Text>
          <Text style={styles.col3}>{totalUnidades} un.</Text>
          <Text style={[styles.col4, { color: '#047857' }]}>100%</Text>
        </View>
      </View>

      <View style={styles.signatureSection}>
        <View style={styles.signBox}>
          <Text style={{ fontSize: 8 }}>Entregue por (Padaria da Vila)</Text>
          <Text style={[styles.subtitle, { marginTop: 2 }]}>{carrinha.nome_condutor}</Text>
        </View>
        <View style={styles.signBox}>
          <Text style={{ fontSize: 8 }}>Recebido por (Cliente Institucional)</Text>
          <Text style={[styles.subtitle, { marginTop: 2 }]}>{nomeRecebedor || 'Carimbo & Assinatura'}</Text>
        </View>
      </View>
    </Page>
  </Document>
);
