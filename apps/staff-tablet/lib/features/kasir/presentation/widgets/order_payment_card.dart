import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';

import '../../domain/entities/order_with_payment_entity.dart';
import '../bloc/kasir_bloc.dart';
import '../bloc/kasir_event.dart';

class OrderPaymentCard extends StatefulWidget {
  final OrderWithPaymentEntity orderWithPayment;

  const OrderPaymentCard({super.key, required this.orderWithPayment});

  @override
  State<OrderPaymentCard> createState() => _OrderPaymentCardState();
}

class _OrderPaymentCardState extends State<OrderPaymentCard> {
  bool _isExpanded = false;
  bool _showPaymentProof = false;
  final currencyFormatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  @override
  Widget build(BuildContext context) {
    final order = widget.orderWithPayment.order;
    final payment = widget.orderWithPayment.payment;

    // Debug logging
    print('🎴 OrderPaymentCard - Order: ${order.orderNumber}');
    print('   Payment: ${payment != null ? 'exists' : 'null'}');
    if (payment != null) {
      print('   Payment Status: ${payment.status}');
      print('   Payment Method: ${payment.paymentMethod}');
      print('   Proof URL: ${payment.proofImageUrl ?? 'null'}');
      print('   Needs Verification: ${payment.needsVerification}');
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Column(
        children: [
          // Header - Always visible
          InkWell(
            onTap: () => setState(() => _isExpanded = !_isExpanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Order Number Badge
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: _getStatusColor(),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Center(
                      child: Text(
                        '#${order.orderNumber.substring(order.orderNumber.length - 3)}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Order Info
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Text(
                              'Order ${order.orderNumber}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                            const SizedBox(width: 8),
                            if (payment?.proofImageUrl != null)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: Colors.blue.shade100,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.image, size: 12, color: Colors.blue.shade800),
                                    const SizedBox(width: 4),
                                    Text(
                                      'Bukti',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.blue.shade800,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(Icons.table_restaurant, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Text(
                              '${order.tableNumber}',
                              style: TextStyle(color: Colors.grey[600], fontSize: 13),
                            ),
                            const SizedBox(width: 12),
                            Icon(Icons.restaurant_menu, size: 14, color: Colors.grey[600]),
                            const SizedBox(width: 4),
                            Text(
                              '${order.items.length} items',
                              style: TextStyle(color: Colors.grey[600], fontSize: 13),
                            ),
                          ],
                        ),
                        if (payment != null) ...[
                          const SizedBox(height: 4),
                          Row(
                            children: [
                              _buildPaymentMethodChip(payment.paymentMethodLabel),
                              const SizedBox(width: 8),
                              _buildPaymentStatusChip(payment.status),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),

                  // Amount and Expand Icon
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        currencyFormatter.format(widget.orderWithPayment.totalAmount),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.green,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Icon(
                        _isExpanded ? Icons.expand_less : Icons.expand_more,
                        color: Colors.grey[600],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Expanded Content
          if (_isExpanded) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Order Items
                  const Text(
                    'Item Pesanan',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  const SizedBox(height: 8),
                  ...order.items.map((item) => Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Expanded(
                              child: Text(
                                '${item.quantity}x ${item.itemName}',
                                style: const TextStyle(fontSize: 13),
                              ),
                            ),
                            Text(
                              currencyFormatter.format(item.subtotal),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            ),
                          ],
                        ),
                      )),

                  // Payment Details
                  if (payment != null) ...[
                    const SizedBox(height: 16),
                    const Text(
                      'Detail Pembayaran',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 8),
                    _buildDetailRow('Metode Pembayaran', payment.paymentMethodLabel),
                    _buildDetailRow('Status', payment.status),
                    _buildDetailRow('Jumlah', currencyFormatter.format(payment.amount)),

                    // Payment Proof Image
                    if (payment.proofImageUrl != null) ...[
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Bukti Pembayaran',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                          ),
                          TextButton.icon(
                            onPressed: () => setState(() => _showPaymentProof = !_showPaymentProof),
                            icon: Icon(
                              _showPaymentProof ? Icons.visibility_off : Icons.visibility,
                              size: 16,
                            ),
                            label: Text(_showPaymentProof ? 'Sembunyikan' : 'Tampilkan'),
                          ),
                        ],
                      ),
                      if (_showPaymentProof) ...[
                        const SizedBox(height: 8),
                        Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.grey.shade300),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Image.network(
                              payment.proofImageUrl!,
                              height: 300,
                              width: double.infinity,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                return Container(
                                  height: 300,
                                  color: Colors.grey.shade100,
                                  child: Center(
                                    child: Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.error_outline, size: 48, color: Colors.grey[400]),
                                        const SizedBox(height: 8),
                                        Text(
                                          'Gagal memuat gambar',
                                          style: TextStyle(color: Colors.grey[600]),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                              loadingBuilder: (context, child, loadingProgress) {
                                if (loadingProgress == null) return child;
                                return Container(
                                  height: 300,
                                  color: Colors.grey.shade100,
                                  child: Center(
                                    child: CircularProgressIndicator(
                                      value: loadingProgress.expectedTotalBytes != null
                                          ? loadingProgress.cumulativeBytesLoaded /
                                              loadingProgress.expectedTotalBytes!
                                          : null,
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ),
                      ],
                    ] else ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline, size: 16, color: Colors.grey[600]),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                payment.paymentMethod == 'cash' || payment.paymentMethod == 'card'
                                    ? 'Pembayaran ${payment.paymentMethodLabel} tidak memerlukan bukti'
                                    : 'Tidak ada bukti pembayaran',
                                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],

                  // Action Buttons - Show if payment exists and is pending
                  if (payment != null && payment.status == 'pending') ...[
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _approvePayment(context),
                            icon: const Icon(Icons.check_circle),
                            label: const Text('Verifikasi'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _rejectPayment(context),
                            icon: const Icon(Icons.cancel),
                            label: const Text('Tolak'),
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red, width: 1.5),
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildPaymentMethodChip(String method) {
    IconData icon;
    Color color;

    switch (method.toLowerCase()) {
      case 'cash':
      case 'tunai':
        icon = Icons.money;
        color = Colors.green;
        break;
      case 'card':
      case 'kartu':
        icon = Icons.credit_card;
        color = Colors.blue;
        break;
      case 'qris':
        icon = Icons.qr_code;
        color = Colors.purple;
        break;
      case 'transfer':
        icon = Icons.account_balance;
        color = Colors.orange;
        break;
      default:
        icon = Icons.payment;
        color = Colors.grey;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            method,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPaymentStatusChip(String status) {
    Color color;
    String label;

    switch (status.toLowerCase()) {
      case 'pending':
        color = Colors.orange;
        label = 'Menunggu';
        break;
      case 'processing':
        color = Colors.blue;
        label = 'Diproses';
        break;
      case 'verified':
      case 'success':
        color = Colors.green;
        label = 'Terverifikasi';
        break;
      case 'failed':
        color = Colors.red;
        label = 'Gagal';
        break;
      default:
        color = Colors.grey;
        label = status;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(fontSize: 13, color: Colors.grey[600]),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor() {
    if (widget.orderWithPayment.payment == null) return Colors.orange;
    if (widget.orderWithPayment.isPaymentVerified) return Colors.green;
    if (widget.orderWithPayment.payment?.status == 'pending') return Colors.blue;
    return Colors.grey;
  }

  void _approvePayment(BuildContext context) {
    if (widget.orderWithPayment.payment != null) {
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Verifikasi Pembayaran'),
          content: Text(
            'Apakah Anda yakin ingin memverifikasi pembayaran untuk Order ${widget.orderWithPayment.order.orderNumber}?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                context.read<KasirBloc>().add(
                      VerifyPayment(widget.orderWithPayment.payment!.id),
                    );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
              ),
              child: const Text('Verifikasi'),
            ),
          ],
        ),
      );
    }
  }

  void _rejectPayment(BuildContext context) {
    if (widget.orderWithPayment.payment != null) {
      showDialog(
        context: context,
        builder: (dialogContext) => AlertDialog(
          title: const Text('Tolak Pembayaran'),
          content: Text(
            'Apakah Anda yakin ingin menolak pembayaran untuk Order ${widget.orderWithPayment.order.orderNumber}? Pesanan akan dikembalikan ke status pending.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Batal'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(dialogContext).pop();
                // TODO: Implement reject payment event
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Fitur tolak pembayaran akan segera ditambahkan'),
                    backgroundColor: Colors.orange,
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.red,
                foregroundColor: Colors.white,
              ),
              child: const Text('Tolak'),
            ),
          ],
        ),
      );
    }
  }
}
