'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
// Remove unused import

// ============================================
// TEMPORARY PAYMENT APPROVAL PAGE
// ============================================
// This is a TEMPORARY page for testing purposes only!
// This page allows viewing and approving payments with proof images.
//
// TODO: DELETE THIS PAGE when implementing the actual admin dashboard
// This is NOT the final implementation - just for testing that orders
// and payment proofs are being saved correctly to the database.
// ============================================

interface OrderItem {
  id: string;
  menu_item_id: string;
  item_name: string;
  item_price: number;
  quantity: number;
  customizations: any;
  customization_price: number;
}

interface Order {
  id: string;
  table_id: string;
  customer_name: string;
  customer_phone: string;
  status: 'pending' | 'pending_payment' | 'confirmed' | 'preparing' | 'ready' | 'delivered';
  total_amount: number;
  payment_method: string;
  payment_proof_url: string | null;
  session_id: string | null;
  created_at: string;
  order_items: OrderItem[];
}

interface DebugInfo {
  totalOrders: number;
  ordersWithProof: number;
}

export default function TempPaymentApprovalPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      console.log('Fetching orders from API...');

      // Fetch orders with payment proofs
      const response = await fetch('/api/orders/pending');
      console.log('API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('API response data:', data);
        console.log('Orders count:', data.orders?.length || 0);
        console.log('Debug info:', data.debug);
        setOrders(data.orders || []);
        setDebugInfo(data.debug || null);
      } else {
        const errorData = await response.json();
        console.error('API error response:', errorData);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvePayment = async (orderId: string) => {
    try {
      setUpdating(orderId);
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'confirmed' })
      });

      if (response.ok) {
        // Refresh orders list
        await fetchOrders();
        alert('Payment approved successfully!');
      } else {
        const errorData = await response.json();
        console.error('Approve error:', errorData);
        alert(`Failed to approve payment: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Error approving payment');
    } finally {
      setUpdating(null);
    }
  };

  const rejectPayment = async (orderId: string) => {
    try {
      setUpdating(orderId);
      const response = await fetch('/api/orders/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status: 'pending_payment' })
      });

      if (response.ok) {
        await fetchOrders();
        alert('Payment rejected - order reset to pending');
      } else {
        const errorData = await response.json();
        console.error('Reject error:', errorData);
        alert(`Failed to reject payment: ${errorData.details || errorData.error}`);
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Error rejecting payment');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* WARNING HEADER */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <h1 className="font-bold text-lg">⚠️ TEMPORARY PAYMENT APPROVAL PAGE ⚠️</h1>
          <p className="text-sm mt-1">
            This is a TEMPORARY testing page only! This page should be DELETED when implementing the actual admin dashboard.
            This is NOT the final implementation - just for testing that orders and payment proofs are saved correctly.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Payment Approval - All Orders</h2>
              <p className="text-sm text-gray-600 mt-1">Approve online payments (with proof) and cash payments (no proof required)</p>
              {debugInfo && (
                <p className="text-sm text-gray-600 mt-1">
                  Total orders in DB: {debugInfo.totalOrders} |
                  Orders with payment proof: {debugInfo.ordersWithProof}
                </p>
              )}
            </div>
            <button
              onClick={fetchOrders}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Refresh
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No pending orders found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Details */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Order Details</h3>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Order ID:</span> {order.id}</p>
                        <p><span className="font-medium">Table:</span> {order.table_id}</p>
                        <p><span className="font-medium">Customer:</span> {order.customer_name}</p>
                        <p><span className="font-medium">Phone:</span> {order.customer_phone}</p>
                        <p><span className="font-medium">Payment Method:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
                            order.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                            order.payment_method === 'card' ? 'bg-blue-100 text-blue-800' :
                            order.payment_method === 'transfer' ? 'bg-purple-100 text-purple-800' :
                            order.payment_method === 'qris' ? 'bg-orange-100 text-orange-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.payment_method === 'cash' ? '💰 Cash' :
                             order.payment_method === 'card' ? '💳 Card' :
                             order.payment_method === 'transfer' ? '🏦 Transfer' :
                             order.payment_method === 'qris' ? '📱 QRIS' :
                             order.payment_method || 'Unknown'}
                          </span>
                        </p>
                        <p><span className="font-medium">Session ID:</span> {order.session_id || 'N/A'}</p>
                        <p><span className="font-medium">Total:</span> Rp {order.total_amount.toLocaleString()}</p>
                        <p><span className="font-medium">Status:</span>
                          <span className={`ml-2 px-2 py-1 rounded text-xs ${
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {order.status}
                          </span>
                        </p>
                        <p><span className="font-medium">Created:</span> {new Date(order.created_at).toLocaleString()}</p>
                      </div>

                      {/* Order Items */}
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="mt-4">
                          <h4 className="font-medium text-sm mb-2">Order Items:</h4>
                          <div className="space-y-1 text-xs">
                            {order.order_items.map((item) => (
                              <div key={item.id} className="bg-gray-50 p-2 rounded">
                                <p className="font-medium">{item.item_name}</p>
                                <p>Qty: {item.quantity} | Price: Rp {item.item_price.toLocaleString()}</p>
                                {item.customizations && (
                                  <p className="text-gray-600">Customizations: {JSON.stringify(item.customizations)}</p>
                                )}
                                {item.customization_price > 0 && (
                                  <p className="text-orange-600">+Rp {item.customization_price.toLocaleString()}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Payment Proof */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Payment Proof</h3>
                      {order.payment_proof_url ? (
                        <div className="space-y-4">
                          <div className="relative w-full h-64 border border-gray-200 rounded">
                            <Image
                              src={order.payment_proof_url}
                              alt="Payment proof"
                              fill
                              className="object-contain rounded"
                              sizes="(max-width: 768px) 100vw, 50vw"
                            />
                          </div>
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700 text-sm underline"
                          >
                            View full size image
                          </a>
                        </div>
                      ) : (
                        <div>
                          {(order.payment_method === 'cash' || order.payment_method === 'card') ? (
                            <div className="bg-blue-50 border border-blue-200 rounded p-4">
                              <p className="text-blue-800 font-medium">
                                {order.payment_method === 'cash' ? '💰 Cash Payment' : '💳 Card Payment'}
                              </p>
                              <p className="text-blue-700 text-sm mt-1">
                                Customer will pay directly at cashier. No payment proof required.
                              </p>
                            </div>
                          ) : !order.payment_method ? (
                            <div className="bg-gray-50 border border-gray-200 rounded p-4">
                              <p className="text-gray-800 font-medium">🔄 Offline Payment</p>
                              <p className="text-gray-700 text-sm mt-1">
                                Payment method not yet specified. Customer will pay at cashier.
                              </p>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic">No payment proof uploaded</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Debug Info for Action Buttons */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <p><strong>Debug Button Conditions:</strong></p>
                    <p>Status: {order.status} (needs 'pending' or 'pending_payment')</p>
                    <p>Payment Method: {order.payment_method || 'N/A'}</p>
                    <p>Payment Proof URL: {order.payment_proof_url ? 'EXISTS' : 'MISSING'}</p>
                    <p>Is Offline Payment: {(order.payment_method === 'cash' || order.payment_method === 'card' || !order.payment_method) ? 'YES' : 'NO'}</p>
                    <p>Show Buttons: {(order.status === 'pending' || order.status === 'pending_payment') && (order.payment_proof_url || order.payment_method === 'cash' || order.payment_method === 'card' || !order.payment_method) ? 'YES' : 'NO'}</p>
                  </div>

                  {/* Action Buttons - Show for offline payments (cash/card, no proof needed) or online payments with proof */}
                  {(order.status === 'pending' || order.status === 'pending_payment') && (order.payment_proof_url || order.payment_method === 'cash' || order.payment_method === 'card' || !order.payment_method) && (
                    <div className="mt-6 flex gap-3">
                      <button
                        onClick={() => approvePayment(order.id)}
                        disabled={updating === order.id}
                        className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {updating === order.id ? 'Approving...' : 'Approve Payment'}
                      </button>
                      <button
                        onClick={() => rejectPayment(order.id)}
                        disabled={updating === order.id}
                        className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {updating === order.id ? 'Rejecting...' : 'Reject Payment'}
                      </button>
                    </div>
                  )}


                  {order.status === 'confirmed' && (
                    <div className="mt-6">
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                        ✅ Payment Approved
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}