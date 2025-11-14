import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../../../core/constants/app_colors.dart';
import '../../../../core/constants/app_strings.dart';
import '../../../../core/constants/device_types.dart';
import '../../../../core/widgets/loading_indicator.dart';
import '../bloc/auth_bloc.dart';
import '../bloc/auth_event.dart';
import '../bloc/auth_state.dart';

class DeviceLoginPage extends StatefulWidget {
  const DeviceLoginPage({super.key});

  @override
  State<DeviceLoginPage> createState() => _DeviceLoginPageState();
}

class _DeviceLoginPageState extends State<DeviceLoginPage> {
  final _deviceIdController = TextEditingController();
  final _deviceNameController = TextEditingController();
  DeviceType? _selectedDeviceType;

  @override
  void dispose() {
    _deviceIdController.dispose();
    _deviceNameController.dispose();
    super.dispose();
  }

  void _handleLogin() {
    if (_deviceIdController.text.isEmpty ||
        _deviceNameController.text.isEmpty ||
        _selectedDeviceType == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Harap lengkapi semua field'),
          backgroundColor: AppColors.colorError,
        ),
      );
      return;
    }

    context.read<AuthBloc>().add(
          DeviceLoginEvent(
            deviceId: _deviceIdController.text,
            deviceName: _deviceNameController.text,
            deviceType: _selectedDeviceType!,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.colorGray50,
      body: BlocConsumer<AuthBloc, AuthState>(
        listener: (context, state) {
          if (state is AuthError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message),
                backgroundColor: AppColors.colorError,
              ),
            );
          } else if (state is DeviceAuthenticated) {
            Navigator.pushReplacementNamed(
              context,
              state.auth.device.type.routeName,
            );
          }
        },
        builder: (context, state) {
          if (state is AuthLoading) {
            return const LoadingIndicator(
              message: 'Menghubungkan perangkat...',
            );
          }

          return Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 600),
              padding: const EdgeInsets.all(48),
              child: Card(
                elevation: 2,
                child: Padding(
                  padding: const EdgeInsets.all(48),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        AppStrings.deviceLogin,
                        style: TextStyle(
                          fontSize: 32,
                          fontWeight: FontWeight.bold,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Silakan pilih tipe perangkat dan masukkan identitas perangkat',
                        style: TextStyle(
                          fontSize: 18,
                          color: AppColors.colorGray600,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 48),
                      TextField(
                        controller: _deviceIdController,
                        decoration: const InputDecoration(
                          labelText: 'Device ID',
                          hintText: 'Masukkan Device ID',
                          border: OutlineInputBorder(),
                        ),
                        style: const TextStyle(fontSize: 18),
                      ),
                      const SizedBox(height: 24),
                      TextField(
                        controller: _deviceNameController,
                        decoration: const InputDecoration(
                          labelText: 'Nama Perangkat',
                          hintText: 'Contoh: Tablet Kasir 1',
                          border: OutlineInputBorder(),
                        ),
                        style: const TextStyle(fontSize: 18),
                      ),
                      const SizedBox(height: 24),
                      DropdownButtonFormField<DeviceType>(
                        initialValue: _selectedDeviceType,
                        decoration: const InputDecoration(
                          labelText: 'Tipe Perangkat',
                          border: OutlineInputBorder(),
                        ),
                        style: const TextStyle(
                          fontSize: 18,
                          color: AppColors.colorGray900,
                        ),
                        items: DeviceType.values.map((type) {
                          return DropdownMenuItem(
                            value: type,
                            child: Row(
                              children: [
                                Container(
                                  width: 24,
                                  height: 24,
                                  decoration: BoxDecoration(
                                    color: _getDeviceColor(type),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Text(type.displayName),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedDeviceType = value;
                          });
                        },
                      ),
                      const SizedBox(height: 48),
                      ElevatedButton(
                        onPressed: _handleLogin,
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size.fromHeight(56),
                        ),
                        child: const Text(
                          'Login Perangkat',
                          style: TextStyle(fontSize: 20),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Color _getDeviceColor(DeviceType type) {
    switch (type) {
      case DeviceType.dapur:
        return AppColors.colorDapur;
      case DeviceType.kasir:
        return AppColors.colorKasir;
      case DeviceType.pelayan:
        return AppColors.colorPelayan;
      case DeviceType.stok:
        return AppColors.colorStok;
    }
  }
}
