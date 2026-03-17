export interface PadronElector {
  cedula: string
  nombre_completo: string
  provincia: string | null
  canton: string | null
  distrito: string | null
  sexo: number | null
}

export interface VehicleTransferDocument {
  id: string
  ticket_id: string | null
  owner_profile_id: string | null
  cedula_propietario: string
  nombre_propietario: string
  calidades_propietario: string
  categoria: string
  anio_fabricacion: number
  vin: string
  valor_hacienda: number
  estado_tributario: string
  placa: string | null
  marca: string | null
  modelo: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export const useVehicleTransfer = () => {
  const supabase = useSupabaseClient()

  const buscarPropietarioPorCedula = async (cedula: string) => {
    const { data, error } = await supabase
      .from('padron_electores')
      .select('cedula, nombre_completo, provincia, canton, distrito, sexo')
      .eq('cedula', cedula)
      .single()

    if (error) throw error
    return data as PadronElector
  }

  const buscarDocumentosPorCedula = async (cedula: string) => {
    const { data, error } = await supabase
      .from('vehicle_transfer_documents')
      .select('*')
      .eq('cedula_propietario', cedula)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as VehicleTransferDocument[]
  }

  const crearDocumento = async (payload: {
    ticket_id?: string | null
    owner_profile_id?: string | null
    cedula_propietario: string
    nombre_propietario: string
    calidades_propietario: string
    categoria: string
    anio_fabricacion: number
    vin: string
    valor_hacienda: number
    estado_tributario: string
    placa?: string | null
    marca?: string | null
    modelo?: string | null
    color?: string | null
  }) => {
    const { data, error } = await supabase
      .from('vehicle_transfer_documents')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data as VehicleTransferDocument
  }

  return {
    buscarPropietarioPorCedula,
    buscarDocumentosPorCedula,
    crearDocumento
  }
}