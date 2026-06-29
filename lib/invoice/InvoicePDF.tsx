// Server-only — imported only from lib/invoice/generate.ts (a Route Handler dep).
// No "use client" here; this is rendered by @react-pdf's own Node.js reconciler.

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// ── Brand colours ─────────────────────────────────────────────────────────────

const C = {
  terracotta: "#E0825F",
  navy:       "#1F2A52",
  gold:       "#E2A33C",
  gray:       "#7A7E8E",
  lightGray:  "#F2F2F4",
  border:     "#E0E0E6",
  white:      "#FFFFFF",
};

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  // Page
  page: {
    fontFamily:      "Helvetica",
    fontSize:        9,
    color:           C.navy,
    paddingTop:      48,
    paddingBottom:   72, // room for footer
    paddingLeft:     48,
    paddingRight:    48,
    lineHeight:      1.5,
  },

  // ── Header ─────────────────────────────────────────────────
  header: {
    flexDirection:   "row",
    justifyContent:  "space-between",
    alignItems:      "flex-start",
    marginBottom:    20,
  },
  brandName: {
    fontFamily:      "Times-Italic",
    fontSize:        26,
    color:           C.terracotta,
    letterSpacing:   0.5,
  },
  brandTagline: {
    fontSize:        8,
    color:           C.gray,
    marginTop:       2,
  },
  brandContact: {
    fontSize:        8,
    color:           C.gray,
    marginTop:       2,
  },
  invoiceMeta: {
    alignItems:      "flex-end",
  },
  invoiceTitle: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        18,
    color:           C.navy,
    letterSpacing:   3,
  },
  invoiceNum: {
    fontSize:        9,
    color:           C.gray,
    marginTop:       3,
    textAlign:       "right",
  },

  // ── Gold rule ───────────────────────────────────────────────
  goldRule: {
    height:          1.5,
    backgroundColor: C.gold,
    marginBottom:    20,
  },

  // ── Bill to ─────────────────────────────────────────────────
  billSection: {
    marginBottom:    24,
  },
  sectionLabel: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        7,
    color:           C.gray,
    letterSpacing:   1.5,
    marginBottom:    6,
  },
  billName: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        10,
    color:           C.navy,
    marginBottom:    2,
  },
  billDetail: {
    fontSize:        9,
    color:           C.gray,
    marginBottom:    1.5,
  },

  // ── Table ────────────────────────────────────────────────────
  tableHeader: {
    flexDirection:   "row",
    backgroundColor: C.navy,
    paddingTop:      7,
    paddingBottom:   7,
    paddingLeft:     8,
    paddingRight:    8,
    borderRadius:    3,
    marginBottom:    2,
  },
  tableRow: {
    flexDirection:   "row",
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingTop:      7,
    paddingBottom:   7,
    paddingLeft:     8,
    paddingRight:    8,
  },
  tableRowAlt: {
    backgroundColor: C.lightGray,
  },

  // Column widths (flex units)
  colProduct:  { flex: 4 },
  colVariant:  { flex: 2.5 },
  colQty:      { flex: 0.8 },
  colPrice:    { flex: 1.5 },
  colTotal:    { flex: 1.5 },

  headerCell: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        7.5,
    color:           C.white,
    letterSpacing:   0.5,
  },
  cell: {
    fontSize:        9,
    color:           C.navy,
  },
  cellRight: {
    fontSize:        9,
    color:           C.navy,
    textAlign:       "right",
  },
  headerCellRight: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        7.5,
    color:           C.white,
    letterSpacing:   0.5,
    textAlign:       "right",
  },
  headerCellCenter: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        7.5,
    color:           C.white,
    letterSpacing:   0.5,
    textAlign:       "center",
  },
  cellCenter: {
    fontSize:        9,
    color:           C.navy,
    textAlign:       "center",
  },

  // ── Totals ───────────────────────────────────────────────────
  totalsSection: {
    alignItems:      "flex-end",
    marginTop:       14,
  },
  totalsRow: {
    flexDirection:   "row",
    width:           210,
    justifyContent:  "space-between",
    marginBottom:    4,
  },
  totalsLabel: {
    fontSize:        9,
    color:           C.gray,
  },
  totalsValue: {
    fontSize:        9,
    color:           C.navy,
  },
  totalsDivider: {
    width:           210,
    height:          1,
    backgroundColor: C.border,
    marginTop:       4,
    marginBottom:    8,
  },
  grandTotalLabel: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        11,
    color:           C.navy,
  },
  grandTotalValue: {
    fontFamily:      "Helvetica-Bold",
    fontSize:        11,
    color:           C.terracotta,
  },

  // ── Footer (absolute, repeats on every page) ─────────────────
  footer: {
    position:        "absolute",
    bottom:          32,
    left:            48,
    right:           48,
    borderTopWidth:  1,
    borderTopColor:  C.border,
    paddingTop:      10,
  },
  footerText: {
    fontFamily:      "Times-Italic",
    fontSize:        8,
    color:           C.gray,
    textAlign:       "center",
  },
  footerContact: {
    fontSize:        7.5,
    color:           C.gray,
    textAlign:       "center",
    marginTop:       3,
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type InvoiceData = {
  invoiceNumber: string;
  date:          string;
  customer: {
    fullName:      string;
    email:         string;
    phone:         string;
    addressLine1:  string;
    addressLine2?: string;
    city:          string;
    state:         string;
    pincode:       string;
  };
  items: {
    name:         string;
    variantLabel: string;
    qty:          number;
    unitPrice:    number;
  }[];
  subtotal: number;
  shipping: number;
  total:    number;
};

// ── Component ─────────────────────────────────────────────────────────────────

export function InvoicePDF({ data }: { data: InvoiceData }) {
  const { invoiceNumber, date, customer, items, subtotal, shipping, total } = data;

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`; // ₹

  return (
    <Document
      title={`Invoice ${invoiceNumber} — Dreamcraft`}
      author="Dreamcraft"
      creator="Dreamcraft"
    >
      <Page size="A4" style={S.page}>

        {/* ── Header ──────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.brandName}>Dreamcraft</Text>
            <Text style={S.brandTagline}>Handcrafted home décor</Text>
            <Text style={S.brandContact}>hello@dreamcraft.in</Text>
          </View>
          <View style={S.invoiceMeta}>
            <Text style={S.invoiceTitle}>INVOICE</Text>
            <Text style={S.invoiceNum}>{invoiceNumber}</Text>
            <Text style={S.invoiceNum}>{date}</Text>
          </View>
        </View>

        {/* ── Gold rule ────────────────────────────────────── */}
        <View style={S.goldRule} />

        {/* ── Bill to ─────────────────────────────────────── */}
        <View style={S.billSection}>
          <Text style={S.sectionLabel}>BILL TO</Text>
          <Text style={S.billName}>{customer.fullName}</Text>
          <Text style={S.billDetail}>{customer.addressLine1}</Text>
          {customer.addressLine2 ? (
            <Text style={S.billDetail}>{customer.addressLine2}</Text>
          ) : null}
          <Text style={S.billDetail}>
            {customer.city}, {customer.state} — {customer.pincode}
          </Text>
          <Text style={S.billDetail}>{customer.phone}</Text>
          <Text style={S.billDetail}>{customer.email}</Text>
        </View>

        {/* ── Items table ─────────────────────────────────── */}

        {/* Table header */}
        <View style={S.tableHeader}>
          <View style={S.colProduct}>
            <Text style={S.headerCell}>PRODUCT</Text>
          </View>
          <View style={S.colVariant}>
            <Text style={S.headerCell}>VARIANT</Text>
          </View>
          <View style={S.colQty}>
            <Text style={S.headerCellCenter}>QTY</Text>
          </View>
          <View style={S.colPrice}>
            <Text style={S.headerCellRight}>UNIT PRICE</Text>
          </View>
          <View style={S.colTotal}>
            <Text style={S.headerCellRight}>TOTAL</Text>
          </View>
        </View>

        {/* Table rows */}
        {items.map((item, i) => (
          <View
            key={i}
            style={i % 2 === 1 ? [S.tableRow, S.tableRowAlt] : S.tableRow}
          >
            <View style={S.colProduct}>
              <Text style={S.cell}>{item.name}</Text>
            </View>
            <View style={S.colVariant}>
              <Text style={S.cell}>{item.variantLabel}</Text>
            </View>
            <View style={S.colQty}>
              <Text style={S.cellCenter}>{item.qty}</Text>
            </View>
            <View style={S.colPrice}>
              <Text style={S.cellRight}>{fmt(item.unitPrice)}</Text>
            </View>
            <View style={S.colTotal}>
              <Text style={S.cellRight}>{fmt(item.unitPrice * item.qty)}</Text>
            </View>
          </View>
        ))}

        {/* ── Totals ──────────────────────────────────────── */}
        <View style={S.totalsSection}>
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>Subtotal</Text>
            <Text style={S.totalsValue}>{fmt(subtotal)}</Text>
          </View>
          <View style={S.totalsRow}>
            <Text style={S.totalsLabel}>Shipping</Text>
            <Text style={S.totalsValue}>
              {shipping === 0 ? "Free" : fmt(shipping)}
            </Text>
          </View>
          <View style={S.totalsDivider} />
          <View style={S.totalsRow}>
            <Text style={S.grandTotalLabel}>Total</Text>
            <Text style={S.grandTotalValue}>{fmt(total)}</Text>
          </View>
        </View>

        {/* ── Footer (fixed — appears on every page) ───────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            Thank you for shopping with Dreamcraft — handmade with love.
          </Text>
          <Text style={S.footerContact}>
            hello@dreamcraft.in · dreamcraft.in
          </Text>
        </View>

      </Page>
    </Document>
  );
}
