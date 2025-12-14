import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import usersApi, { type UpdateProfileRequest, type ChangePasswordRequest } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import type { Gender, NotificationChannel } from '../../api/types';
import ClientLayout from '../../components/layout/ClientLayout';

type TabKey = 'data' | 'prefs' | 'security';

const ProfilePage: React.FC = () => {
    const queryClient = useQueryClient();
    const { updateUser } = useAuth();

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeTab, setActiveTab] = useState<TabKey>('data');

    const actionsRef = useRef<HTMLDetailsElement | null>(null);
    const closeActions = () => {
        if (actionsRef.current) actionsRef.current.open = false;
    };

    const { data: profile, isLoading } = useQuery({
        queryKey: ['profile'],
        queryFn: usersApi.getMe,
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
    });

    const initials = useMemo(() => {
        const name = (profile?.fullName || 'A').trim();
        const parts = name.split(/\s+/).filter(Boolean);
        const a = parts[0]?.[0] ?? 'A';
        const b = parts[1]?.[0] ?? '';
        return (a + b).toUpperCase();
    }, [profile?.fullName]);

    const emailVerified = useMemo(() => {
        const raw =
            (profile as any)?.emailVerified ??
            (profile as any)?.email_verified ??
            (profile as any)?.isEmailVerified ??
            (profile as any)?.emailVerifiedAt;

        if (raw == null) return false;
        if (typeof raw === 'boolean') return raw;
        if (typeof raw === 'number') return raw === 1;
        if (typeof raw === 'string') {
            const v = raw.trim().toLowerCase();
            return v === 'true' || v === '1' || v.length > 10; // timestamp típico
        }
        return !!raw;
    }, [profile]);

    const [profileData, setProfileData] = useState<UpdateProfileRequest>({
        fullName: '',
        phone: '',
        gender: 'MALE' as Gender,
        birthDate: null as any,
        notificationChannel: 'WHATSAPP' as NotificationChannel,
        marketingOptIn: false,
    });

    const [passwordData, setPasswordData] = useState<ChangePasswordRequest>({
        currentPassword: '',
        newPassword: '',
    });

    useEffect(() => {
        if (!profile) return;

        setProfileData({
            fullName: profile.fullName || '',
            phone: profile.phone || '',
            gender: (profile.gender as Gender) || ('MALE' as Gender),
            birthDate: profile.birthDate ? (profile.birthDate.split('T')[0] as any) : ('' as any),
            notificationChannel:
                (profile.notificationChannel as NotificationChannel) || ('WHATSAPP' as NotificationChannel),
            marketingOptIn: !!profile.marketingOptIn,
        });
    }, [profile]);

    const updateProfileMutation = useMutation({
        mutationFn: usersApi.updateMe,
        onSuccess: (updatedUser) => {
            queryClient.invalidateQueries({ queryKey: ['profile'] });
            updateUser(updatedUser);
            setSuccess('Perfil actualizado correctamente');
            setError('');
        },
        onError: (err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : 'Error al actualizar perfil';
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const axiosError = err as { response?: { data?: { message?: string } } };
                setError(axiosError.response?.data?.message || errorMessage);
            } else {
                setError(errorMessage);
            }
            setSuccess('');
        },
    });

    const changePasswordMutation = useMutation({
        mutationFn: usersApi.changePassword,
        onSuccess: () => {
            setSuccess('Contraseña actualizada correctamente');
            setError('');
            setPasswordData({ currentPassword: '', newPassword: '' });
        },
        onError: (err: unknown) => {
            const errorMessage = err instanceof Error ? err.message : 'Error al cambiar contraseña';
            if (typeof err === 'object' && err !== null && 'response' in err) {
                const axiosError = err as { response?: { data?: { message?: string } } };
                setError(axiosError.response?.data?.message || errorMessage);
            } else {
                setError(errorMessage);
            }
            setSuccess('');
        },
    });

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const dataToSend: any = { ...profileData };

        if (!dataToSend.phone || String(dataToSend.phone).trim() === '') dataToSend.phone = null;

        if (dataToSend.birthDate && String(dataToSend.birthDate).trim() !== '') {
            const d = String(dataToSend.birthDate).trim();
            dataToSend.birthDate = new Date(`${d}T00:00:00.000Z`).toISOString();
        } else {
            dataToSend.birthDate = null;
        }

        if ('email' in dataToSend) delete dataToSend.email;

        updateProfileMutation.mutate(dataToSend);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        changePasswordMutation.mutate(passwordData);
    };

    const goToTab = (tab: TabKey) => {
        setActiveTab(tab);
        closeActions();
    };

    return (
        <ClientLayout title="Perfil" subtitle="Gestiona tus datos, preferencias y seguridad.">
            {isLoading ? (
                <div className="owner-home__loading">
                    <span className="owner-home__loading-text">Cargando perfil...</span>
                </div>
            ) : (
                <div className="owner-profile-page mx-auto flex flex-col gap-6">
                    {error && <div className="alert alert-error">{error}</div>}
                    {success && <div className="alert alert-success">{success}</div>}

                    {/* HERO */}
                    <section className="admin-card">
                        <div className="owner-profile-hero__row flex items-start justify-between gap-4">
                            <div className="owner-profile-hero__left flex items-start gap-4 min-w-0">
                                <div className="owner-profile-hero__avatar" aria-hidden="true">
                                    {initials}
                                </div>

                                <div className="owner-profile-hero__text min-w-0">
                                    <h2 className="owner-profile-hero__name">{profile?.fullName || '—'}</h2>

                                    <div className="owner-profile-hero__meta">
                                        <span>{profile?.email || '—'}</span>
                                        {profile?.phone ? (
                                            <>
                                                <span className="owner-profile-hero__dot">•</span>
                                                <span>{profile.phone}</span>
                                            </>
                                        ) : null}
                                    </div>

                                    <div className="owner-profile-hero__badges">
                                        <span className="owner-badge owner-badge--primary">CLIENTE</span>
                                        <span
                                            className={`owner-badge ${emailVerified ? 'owner-badge--success' : 'owner-badge--error'
                                                }`}
                                        >
                                            {emailVerified ? 'EMAIL VERIFICADO' : 'EMAIL SIN VERIFICAR'}
                                        </span>

                                        {profile?.phone ? (
                                            <span
                                                className={`owner-badge ${profile?.phoneVerified ? 'owner-badge--success' : 'owner-badge--warning'
                                                    }`}
                                            >
                                                {profile?.phoneVerified ? 'TELÉFONO VERIFICADO' : 'TELÉFONO SIN VERIFICAR'}
                                            </span>
                                        ) : null}
                                    </div>

                                    {!emailVerified ? (
                                        <p className="text-muted mt-2">
                                            Tu correo aún no está verificado. Es posible que el sistema limite acciones (por ejemplo, reservar).
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* TABS */}
                    <nav className="tabs" aria-label="Secciones del perfil">
                        <button
                            type="button"
                            className={`tab ${activeTab === 'data' ? 'active' : ''}`}
                            onClick={() => goToTab('data')}
                        >
                            Datos
                        </button>
                        <button
                            type="button"
                            className={`tab ${activeTab === 'prefs' ? 'active' : ''}`}
                            onClick={() => goToTab('prefs')}
                        >
                            Preferencias
                        </button>
                        <button
                            type="button"
                            className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                            onClick={() => goToTab('security')}
                        >
                            Seguridad
                        </button>
                    </nav>

                    {/* CONTENT */}
                    {activeTab === 'data' && (
                        <section className="admin-card">
                            <div className="mb-6">
                                <h3 className="admin-card__title">Datos personales</h3>
                                <p className="admin-card__subtitle">Actualiza tu información principal.</p>
                            </div>

                            <form className="owner-form" onSubmit={handleProfileSubmit}>
                                <Input
                                    name="fullName"
                                    label="Nombre completo"
                                    value={profileData.fullName || ''}
                                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                                    required
                                />

                                <Input
                                    name="email"
                                    label="Correo electrónico"
                                    value={profile?.email || ''}
                                    disabled
                                    helperText="Tu correo principal. No se puede modificar."
                                />

                                <Input
                                    name="phone"
                                    label="Teléfono (opcional)"
                                    value={(profileData.phone as any) || ''}
                                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                                    placeholder="Ej: 999888777"
                                    helperText="Opcional (WhatsApp/SMS)."
                                />

                                <Select
                                    name="gender"
                                    label="Género"
                                    value={(profileData.gender as any) || 'MALE'}
                                    onChange={(e) => setProfileData({ ...profileData, gender: e.target.value as Gender })}
                                    options={[
                                        { value: 'MALE', label: 'Masculino' },
                                        { value: 'FEMALE', label: 'Femenino' },
                                        { value: 'OTHER', label: 'Otro' },
                                        { value: 'PREFER_NOT_TO_SAY', label: 'Prefiero no decirlo' },
                                    ]}
                                />

                                <Input
                                    name="birthDate"
                                    label="Fecha de nacimiento (opcional)"
                                    type="date"
                                    value={(profileData.birthDate as any) || ''}
                                    onChange={(e) => setProfileData({ ...profileData, birthDate: e.target.value as any })}
                                />

                                <div className="mt-2">
                                    <Button type="submit" variant="primary" isLoading={updateProfileMutation.isPending}>
                                        Guardar cambios
                                    </Button>
                                </div>
                            </form>
                        </section>
                    )}

                    {activeTab === 'prefs' && (
                        <section className="admin-card">
                            <div className="mb-6">
                                <h3 className="admin-card__title">Preferencias</h3>
                                <p className="admin-card__subtitle">Canales y comunicaciones.</p>
                            </div>

                            <form className="owner-form" onSubmit={handleProfileSubmit}>
                                <Select
                                    name="notificationChannel"
                                    label="Canal de notificación"
                                    value={(profileData.notificationChannel as any) || 'WHATSAPP'}
                                    onChange={(e) =>
                                        setProfileData({
                                            ...profileData,
                                            notificationChannel: e.target.value as NotificationChannel,
                                        })
                                    }
                                    options={[
                                        { value: 'WHATSAPP', label: 'WhatsApp' },
                                        { value: 'SMS', label: 'SMS' },
                                        { value: 'EMAIL', label: 'Email' },
                                    ]}
                                />

                                <label className="owner-switch">
                                    <input
                                        type="checkbox"
                                        checked={!!profileData.marketingOptIn}
                                        onChange={(e) => setProfileData({ ...profileData, marketingOptIn: e.target.checked })}
                                    />
                                    Acepto recibir comunicaciones promocionales
                                </label>

                                <div className="mt-2">
                                    <Button type="submit" variant="primary" isLoading={updateProfileMutation.isPending}>
                                        Guardar cambios
                                    </Button>
                                </div>
                            </form>
                        </section>
                    )}

                    {activeTab === 'security' && (
                        <section className="admin-card">
                            <div className="mb-6">
                                <h3 className="admin-card__title">Seguridad</h3>
                                <p className="admin-card__subtitle">Actualiza tu contraseña.</p>
                            </div>

                            <form className="owner-form" onSubmit={handlePasswordSubmit}>
                                <Input
                                    name="currentPassword"
                                    label="Contraseña actual"
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    required
                                />
                                <Input
                                    name="newPassword"
                                    label="Nueva contraseña"
                                    type="password"
                                    value={passwordData.newPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                    required
                                    minLength={6}
                                    helperText="Mínimo 6 caracteres."
                                />

                                <div className="mt-2">
                                    <Button type="submit" variant="primary" isLoading={changePasswordMutation.isPending}>
                                        Actualizar contraseña
                                    </Button>
                                </div>
                            </form>
                        </section>
                    )}
                </div>
            )}
        </ClientLayout>
    );
};

export default ProfilePage;
