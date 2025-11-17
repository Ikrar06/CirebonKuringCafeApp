import 'package:flutter/material.dart';

class CashReconciliationScreen extends StatelessWidget {
  const CashReconciliationScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Rekap Kas')),
      body: const Center(child: Text('Cash Reconciliation Screen')),
    );
  }
}
