import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../domain/entities/cash_summary_entity.dart';
import '../bloc/kasir_bloc.dart';
import '../bloc/kasir_event.dart';
import '../bloc/kasir_state.dart';

class CashReconciliationScreen extends StatefulWidget {
  const CashReconciliationScreen({super.key});

  @override
  State<CashReconciliationScreen> createState() => _CashReconciliationScreenState();
}

class _CashReconciliationScreenState extends State<CashReconciliationScreen> {
  final currencyFormatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  // Denomination state
  final Map<int, int> _denominationCounts = {};
  double _actualAmount = 0;
  double _expectedAmount = 0;
  int _totalOrders = 0;
  double _cashSales = 0;
  final double _startingCash = 500000; // Default starting cash

  // Form state
  bool _showForm = false;
  final _notesController = TextEditingController();
  final _employeeNameController = TextEditingController();

  // Indonesian denominations
  final List<Map<String, dynamic>> _denominations = [
    {'value': 100000, 'label': 'Rp 100.000', 'type': 'note'},
    {'value': 50000, 'label': 'Rp 50.000', 'type': 'note'},
    {'value': 20000, 'label': 'Rp 20.000', 'type': 'note'},
    {'value': 10000, 'label': 'Rp 10.000', 'type': 'note'},
    {'value': 5000, 'label': 'Rp 5.000', 'type': 'note'},
    {'value': 2000, 'label': 'Rp 2.000', 'type': 'note'},
    {'value': 1000, 'label': 'Rp 1.000', 'type': 'note'},
    {'value': 500, 'label': 'Rp 500', 'type': 'coin'},
    {'value': 200, 'label': 'Rp 200', 'type': 'coin'},
    {'value': 100, 'label': 'Rp 100', 'type': 'coin'},
  ];

  @override
  void initState() {
    super.initState();
    _loadExpectedAmount();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _employeeNameController.dispose();
    super.dispose();
  }

  void _loadExpectedAmount() {
    context.read<KasirBloc>().add(WatchOrders());
  }

  void _calculateActualAmount() {
    double total = 0;
    _denominationCounts.forEach((value, count) {
      total += value * count;
    });
    setState(() {
      _actualAmount = total;
    });
  }

  void _handleDenominationChange(int value, String countStr) {
    final count = int.tryParse(countStr) ?? 0;
    setState(() {
      if (count > 0) {
        _denominationCounts[value] = count;
      } else {
        _denominationCounts.remove(value);
      }
    });
    _calculateActualAmount();
  }

  void _resetDenominations() {
    setState(() {
      _denominationCounts.clear();
      _actualAmount = 0;
    });
  }

  void _submitReconciliation() {
    if (_employeeNameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mohon masukkan nama petugas'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    final variance = _actualAmount - _expectedAmount;
    if (variance != 0 && _notesController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mohon berikan catatan untuk selisih kas'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    // Create cash summary
    final summary = CashSummaryEntity(
      id: '',
      date: DateTime.now(),
      openingBalance: _startingCash,
      expectedCash: _expectedAmount,
      actualCash: _actualAmount,
      difference: variance,
      totalCashTransactions: _totalOrders,
      totalQrisTransactions: 0,
      totalTransferTransactions: 0,
      totalCashAmount: _cashSales,
      totalQrisAmount: 0,
      totalTransferAmount: 0,
      notes: _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      employeeId: 'system', // Will be set by the use case
      employeeName: _employeeNameController.text.trim(),
      createdAt: DateTime.now(),
    );

    context.read<KasirBloc>().add(CreateCashSummary(summary));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Rekap Kas'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadExpectedAmount,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: BlocConsumer<KasirBloc, KasirState>(
        listener: (context, state) {
          if (state is KasirError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.red),
            );
          } else if (state is KasirOperationSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text(state.message), backgroundColor: Colors.green),
            );
            // Reset form
            setState(() {
              _showForm = false;
              _denominationCounts.clear();
              _actualAmount = 0;
              _notesController.clear();
              _employeeNameController.clear();
            });
          }
        },
        builder: (context, state) {
          if (state is KasirLoading || state is KasirInitial) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is KasirLoaded) {
            // Calculate expected amount from orders
            final orders = state.orders;
            _totalOrders = orders.where((o) => o.order.status == 'completed').length;
            _cashSales = orders
                .where((o) => o.order.status == 'completed' && o.payment?.paymentMethod == 'cash')
                .fold<double>(0, (sum, o) => sum + o.totalAmount);
            _expectedAmount = _startingCash + _cashSales;

            return _buildContent();
          }

          return const Center(child: Text('Tidak ada data'));
        },
      ),
    );
  }

  Widget _buildContent() {
    final variance = _actualAmount - _expectedAmount;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Date Info
          _buildDateInfo(),
          const SizedBox(height: 16),

          // Expected Amount Info
          _buildExpectedInfo(),
          const SizedBox(height: 16),

          // Cash Summary
          _buildCashSummary(variance),
          const SizedBox(height: 16),

          // Denomination Calculator
          _buildDenominationCalculator(),
          const SizedBox(height: 16),

          // Variance Analysis
          if (_actualAmount > 0) ...[
            _buildVarianceAnalysis(variance),
            const SizedBox(height: 16),
          ],

          // Reconciliation Form
          if (_actualAmount > 0 && !_showForm) ...[
            Center(
              child: ElevatedButton(
                onPressed: () {
                  setState(() {
                    _showForm = true;
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                child: const Text(
                  'Lanjut ke Submit Rekap',
                  style: TextStyle(fontSize: 16),
                ),
              ),
            ),
          ],

          if (_showForm) ...[
            _buildReconciliationForm(variance),
            const SizedBox(height: 16),
          ],

          // Instructions
          _buildInstructions(),
        ],
      ),
    );
  }

  Widget _buildDateInfo() {
    return Card(
      color: Colors.blue[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Tanggal Rekap',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 4),
                Text(
                  DateFormat('EEEE, d MMMM y', 'id_ID').format(DateTime.now()),
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const Text(
              'Penghitungan Kas Hari Ini',
              style: TextStyle(fontSize: 12, color: Colors.blue),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExpectedInfo() {
    return Card(
      color: Colors.purple[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.info_outline, size: 20, color: Colors.purple),
                SizedBox(width: 8),
                Text(
                  'Rincian Kas Yang Diharapkan',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Modal Awal',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        currencyFormatter.format(_startingCash),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Penjualan Cash ($_totalOrders pesanan)',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        currencyFormatter.format(_cashSales),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Total Yang Diharapkan',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        currencyFormatter.format(_expectedAmount),
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              '💡 Total yang diharapkan = Modal awal + Penjualan cash hari ini',
              style: TextStyle(fontSize: 11, color: Colors.purple),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCashSummary(double variance) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.account_balance_wallet, size: 20),
                SizedBox(width: 8),
                Text(
                  'Ringkasan Kas',
                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildSummaryCard(
                    label: 'Diharapkan',
                    value: currencyFormatter.format(_expectedAmount),
                    color: Colors.blue,
                    icon: Icons.calculate,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSummaryCard(
                    label: 'Perhitungan Aktual',
                    value: currencyFormatter.format(_actualAmount),
                    color: Colors.green,
                    icon: Icons.attach_money,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSummaryCard(
                    label: 'Selisih',
                    value: '${variance >= 0 ? '+' : ''}${currencyFormatter.format(variance)}',
                    color: variance == 0
                        ? Colors.grey
                        : variance > 0
                            ? Colors.orange
                            : Colors.red,
                    icon: variance >= 0 ? Icons.trending_up : Icons.trending_down,
                  ),
                ),
              ],
            ),
            if (variance != 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: variance > 0 ? Colors.orange[50] : Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: variance > 0 ? Colors.orange : Colors.red,
                    width: 1,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      variance > 0 ? Icons.trending_up : Icons.trending_down,
                      color: variance > 0 ? Colors.orange : Colors.red,
                      size: 20,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        variance > 0
                            ? 'Kelebihan Kas Terdeteksi: ${currencyFormatter.format(variance)}'
                            : 'Kekurangan Kas Terdeteksi: ${currencyFormatter.format(variance.abs())}',
                        style: TextStyle(
                          fontSize: 12,
                          color: variance > 0 ? Colors.orange[900] : Colors.red[900],
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            if (variance == 0 && _actualAmount > 0) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.green, width: 1),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.check_circle, color: Colors.green, size: 20),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Kas Seimbang: Perhitungan kas sesuai dengan catatan sistem',
                        style: TextStyle(fontSize: 12, color: Colors.green),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(fontSize: 10, color: Colors.grey),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildDenominationCalculator() {
    final notes = _denominations.where((d) => d['type'] == 'note').toList();
    final coins = _denominations.where((d) => d['type'] == 'coin').toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Kalkulator Denominasi Kas',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                TextButton(
                  onPressed: _resetDenominations,
                  child: const Text('Reset'),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Banknotes
            Row(
              children: [
                const Icon(Icons.money, size: 16, color: Colors.green),
                const SizedBox(width: 8),
                Text(
                  'Uang Kertas',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.grey[700]),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...notes.map((denom) => _buildDenominationInput(denom)),
            const SizedBox(height: 16),

            // Coins
            Row(
              children: [
                const Icon(Icons.monetization_on, size: 16, color: Colors.orange),
                const SizedBox(width: 8),
                Text(
                  'Uang Logam',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.grey[700]),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...coins.map((denom) => _buildDenominationInput(denom)),
            const SizedBox(height: 16),

            // Total
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total Perhitungan Kas',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    currencyFormatter.format(_actualAmount),
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDenominationInput(Map<String, dynamic> denom) {
    final value = denom['value'] as int;
    final count = _denominationCounts[value] ?? 0;
    final subtotal = value * count;

    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.grey[50],
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    denom['label'] as String,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                  if (count > 0)
                    Text(
                      '$count × ${currencyFormatter.format(value)} = ${currencyFormatter.format(subtotal)}',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                ],
              ),
            ),
            SizedBox(
              width: 80,
              child: TextField(
                keyboardType: TextInputType.number,
                textAlign: TextAlign.right,
                decoration: InputDecoration(
                  hintText: '0',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                onChanged: (value) => _handleDenominationChange(denom['value'] as int, value),
                controller: TextEditingController(text: count > 0 ? count.toString() : ''),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildVarianceAnalysis(double variance) {
    final variancePercent = _expectedAmount > 0 ? (variance / _expectedAmount) * 100 : 0;
    final absPercent = variancePercent.abs();

    String severity;
    Color color;
    IconData icon;
    String title;
    String message;

    if (variance == 0) {
      severity = 'success';
      color = Colors.green;
      icon = Icons.check_circle;
      title = 'Seimbang Sempurna';
      message = 'Perhitungan kas sesuai dengan catatan sistem';
    } else if (absPercent < 1) {
      severity = 'info';
      color = Colors.blue;
      icon = Icons.info;
      title = 'Selisih Kecil';
      message = 'Selisih kecil terdeteksi (kurang dari 1%). Masih dalam batas wajar.';
    } else if (absPercent < 5) {
      severity = 'warning';
      color = Colors.orange;
      icon = Icons.warning;
      title = 'Selisih Sedang';
      message = 'Selisih 1-5%. Mohon periksa transaksi dan hitung ulang jika perlu.';
    } else {
      severity = 'error';
      color = Colors.red;
      icon = Icons.error;
      title = 'Selisih Signifikan';
      message = 'Selisih melebihi 5%. Perlu investigasi segera.';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Analisis Selisih',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Status
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: color),
              ),
              child: Row(
                children: [
                  Icon(icon, color: color, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: color),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          message,
                          style: TextStyle(fontSize: 12, color: color.withOpacity(0.8)),
                        ),
                        if (variance != 0) ...[
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Icon(
                                variance > 0 ? Icons.trending_up : Icons.trending_down,
                                color: color,
                                size: 16,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${variance >= 0 ? '+' : ''}${currencyFormatter.format(variance)} (${variancePercent >= 0 ? '+' : ''}${variancePercent.toStringAsFixed(2)}%)',
                                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: color),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReconciliationForm(double variance) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Lengkapi Rekap',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Summary
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ringkasan',
                    style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Diharapkan', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            Text(
                              currencyFormatter.format(_expectedAmount),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Aktual', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            Text(
                              currencyFormatter.format(_actualAmount),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Selisih', style: TextStyle(fontSize: 11, color: Colors.grey)),
                            Text(
                              '${variance >= 0 ? '+' : ''}${currencyFormatter.format(variance)}',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: variance == 0
                                    ? Colors.green
                                    : variance > 0
                                        ? Colors.orange
                                        : Colors.red,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Employee Name
            const Text(
              'Nama Petugas *',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _employeeNameController,
              decoration: const InputDecoration(
                hintText: 'Masukkan nama Anda',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),

            // Notes
            Text(
              'Catatan ${variance != 0 ? '* (Wajib untuk selisih)' : ''}',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: variance != 0
                    ? 'Jelaskan penyebab selisih dan tindakan yang diambil...'
                    : 'Tambahkan catatan atau observasi...',
                border: const OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              variance != 0
                  ? 'Jelaskan alasan selisih dan tindakan korektif yang diambil'
                  : 'Opsional: Tambahkan observasi atau komentar tentang rekap',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
            const SizedBox(height: 16),

            // Warning
            if (variance != 0)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: variance > 0 ? Colors.orange[50] : Colors.red[50],
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: variance > 0 ? Colors.orange : Colors.red,
                  ),
                ),
                child: Text(
                  '⚠️ Rekap ini memiliki selisih ${currencyFormatter.format(variance.abs())}. ${variance > 0 ? 'Kelebihan kas terdeteksi.' : 'Kekurangan kas terdeteksi.'} Pastikan Anda telah mendokumentasikan alasan dan mengambil tindakan yang sesuai sebelum submit.',
                  style: TextStyle(
                    fontSize: 12,
                    color: variance > 0 ? Colors.orange[900] : Colors.red[900],
                  ),
                ),
              ),
            const SizedBox(height: 16),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () {
                      setState(() {
                        _showForm = false;
                      });
                    },
                    child: const Text('Batal'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _submitReconciliation,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.blue,
                    ),
                    child: const Text('Submit Rekap'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructions() {
    return Card(
      color: Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Cara Menggunakan Rekap Kas',
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            _buildInstructionItem('1', 'Hitung semua uang fisik di kasir berdasarkan denominasi'),
            _buildInstructionItem('2', 'Masukkan jumlah untuk setiap denominasi di kalkulator'),
            _buildInstructionItem('3', 'Tinjau analisis selisih - sistem akan membandingkan dengan penjualan'),
            _buildInstructionItem('4', 'Jika ada selisih, berikan catatan detail menjelaskan perbedaan'),
            _buildInstructionItem('5', 'Submit laporan rekap untuk tinjauan manajemen'),
          ],
        ),
      ),
    );
  }

  Widget _buildInstructionItem(String number, String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            '$number.',
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ),
        ],
      ),
    );
  }
}

