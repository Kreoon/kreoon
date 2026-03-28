import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function UPDocumentation() {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Print-hidden header */}
      <div className="print:hidden sticky top-0 bg-white border-b p-4 flex items-center justify-between z-50">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-black">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver
        </Button>
        <Button onClick={handlePrint} className="bg-primary text-primary-foreground">
          <Printer className="w-4 h-4 mr-2" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="text-center mb-8 pb-6 border-b-2 border-gray-200">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Sistema UP (User Points)</h1>
          <p className="text-xl text-gray-600">Documentación Oficial - Creartor Studio</p>
          <p className="text-sm text-gray-400 mt-2">Versión 1.0 - Diciembre 2024</p>
        </div>

        {/* Qué es */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            📖 ¿Qué es el Sistema UP?
          </h2>
          <p className="text-gray-700 leading-relaxed">
            El Sistema UP es un programa de gamificación que recompensa a <strong>creadores</strong> y <strong>editores</strong> por su desempeño. 
            Acumulas puntos (UP) al completar contenidos, entregarlos a tiempo y mantener altos estándares de calidad.
          </p>
        </section>

        {/* Niveles */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🏆 Niveles
          </h2>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">Nivel</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Puntos Requeridos</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Icono</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Bronce</td>
                <td className="border border-gray-300 px-4 py-2">0 - 99 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-2xl">🥉</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Plata</td>
                <td className="border border-gray-300 px-4 py-2">100 - 249 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-2xl">🥈</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Oro</td>
                <td className="border border-gray-300 px-4 py-2">250 - 499 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-2xl">🥇</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Diamante</td>
                <td className="border border-gray-300 px-4 py-2">500+ UP</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-2xl">💎</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Sistema de Puntos */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            ⚡ Sistema de Puntos
          </h2>
          
          <h3 className="text-lg font-semibold text-green-700 mb-3">✅ Puntos Positivos</h3>
          <table className="w-full border-collapse border border-gray-300 mb-6">
            <thead>
              <tr className="bg-green-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Acción</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Puntos</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Video Completado</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-green-600 font-bold">+10 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">Al marcar un contenido como grabado (creador) o entregado (editor)</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Entrega Anticipada</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-green-600 font-bold">+3 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">Entregar antes de la fecha límite (deadline)</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Aprobación sin Correcciones</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-green-600 font-bold">+2 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">Cuando el contenido es aprobado directamente desde revisión</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Racha Perfecta</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-green-600 font-bold">+10 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">Cada 5 entregas consecutivas a tiempo</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-lg font-semibold text-red-700 mb-3">❌ Penalizaciones</h3>
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-red-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Acción</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Puntos</th>
                <th className="border border-gray-300 px-4 py-2 text-left">Descripción</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-4 py-2 font-medium">Entrega Tardía</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-red-600 font-bold">-5 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">Entregar después de la fecha límite</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 font-medium">Corrección Requerida</td>
                <td className="border border-gray-300 px-4 py-2 text-center text-red-600 font-bold">-3 UP</td>
                <td className="border border-gray-300 px-4 py-2 text-sm">Cuando el contenido necesita correcciones</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Racha Perfecta */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🔥 Racha Perfecta
          </h2>
          <div className="bg-orange-50 border border-orange-200 rounded-sm p-4">
            <ul className="space-y-2 text-gray-700">
              <li>• Cada vez que entregas <strong>a tiempo</strong>, tu contador de racha aumenta</li>
              <li>• Al llegar a <strong>5 entregas consecutivas a tiempo</strong>, recibes <strong className="text-green-600">+10 UP de bono</strong></li>
              <li>• El bono se repite cada 5 entregas (10, 15, 20...)</li>
              <li>• <strong className="text-red-600">¡Cuidado!</strong> Una entrega tardía o corrección reinicia la racha a 0</li>
            </ul>
          </div>
        </section>

        {/* Logros */}
        <section className="mb-8 break-before-page">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🎖️ Logros (Achievements)
          </h2>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">Categoría: Completar Contenido</h3>
          <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Logro</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Condición</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Rareza</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">🗡️ Primera Sangre</td>
                <td className="border border-gray-300 px-3 py-2">Completa 1 contenido</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Común</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">🛡️ Prueba del Escudero</td>
                <td className="border border-gray-300 px-3 py-2">Completa 5 contenidos</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Común</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">⚔️ Valor del Caballero</td>
                <td className="border border-gray-300 px-3 py-2">Completa 25 contenidos</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Poco común</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">🏰 Poder del Comandante</td>
                <td className="border border-gray-300 px-3 py-2">Completa 50 contenidos</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Raro</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">👑 Legado del Gran Maestre</td>
                <td className="border border-gray-300 px-3 py-2">Completa 100 contenidos</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Legendario</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">Categoría: Puntos Acumulados</h3>
          <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Logro</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Condición</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Rareza</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">🪙 Tesoro de Bronce</td>
                <td className="border border-gray-300 px-3 py-2">Acumula 100 UP</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Común</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">💰 Fortuna de Plata</td>
                <td className="border border-gray-300 px-3 py-2">Acumula 250 UP</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Poco común</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">🏆 Tesoro Dorado</td>
                <td className="border border-gray-300 px-3 py-2">Acumula 500 UP</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Raro</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">💎 Bóveda de Diamante</td>
                <td className="border border-gray-300 px-3 py-2">Acumula 1000 UP</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Legendario</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">Categoría: Puntualidad</h3>
          <table className="w-full border-collapse border border-gray-300 mb-6 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Logro</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Condición</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Rareza</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">⚡ Mensajero Veloz</td>
                <td className="border border-gray-300 px-3 py-2">3 entregas anticipadas</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Común</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">📬 Correo Real</td>
                <td className="border border-gray-300 px-3 py-2">10 entregas anticipadas</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Poco común</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">⏰ Guardián del Tiempo</td>
                <td className="border border-gray-300 px-3 py-2">25 entregas anticipadas</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Raro</td>
              </tr>
            </tbody>
          </table>

          <h3 className="text-lg font-semibold text-gray-800 mb-3">Categoría: Especiales</h3>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-3 py-2 text-left">Logro</th>
                <th className="border border-gray-300 px-3 py-2 text-left">Condición</th>
                <th className="border border-gray-300 px-3 py-2 text-center">Rareza</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-3 py-2">🏆 Campeón del Torneo</td>
                <td className="border border-gray-300 px-3 py-2">Primer lugar en ranking</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Legendario</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">⭐ Favor del Rey</td>
                <td className="border border-gray-300 px-3 py-2">5 aprobaciones sin correcciones</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Raro</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">⬆️ Ascenso a Plata</td>
                <td className="border border-gray-300 px-3 py-2">Alcanza nivel Plata</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Poco común</td>
              </tr>
              <tr className="bg-gray-50">
                <td className="border border-gray-300 px-3 py-2">⬆️ Ascenso a Oro</td>
                <td className="border border-gray-300 px-3 py-2">Alcanza nivel Oro</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Raro</td>
              </tr>
              <tr>
                <td className="border border-gray-300 px-3 py-2">⬆️ Ascenso a Diamante</td>
                <td className="border border-gray-300 px-3 py-2">Alcanza nivel Diamante</td>
                <td className="border border-gray-300 px-3 py-2 text-center">Legendario</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Estadísticas */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            📊 Estadísticas Registradas
          </h2>
          <div className="bg-blue-50 border border-blue-200 rounded-sm p-4">
            <p className="text-gray-700 mb-2">El sistema lleva registro de:</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
              <li>• Total de puntos (UP)</li>
              <li>• Nivel actual</li>
              <li>• Contenidos completados</li>
              <li>• Entregas a tiempo</li>
              <li>• Entregas tardías</li>
              <li>• Correcciones requeridas</li>
              <li>• Racha actual</li>
            </ul>
          </div>
        </section>

        {/* Ranking */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            🏅 Ranking (Leaderboard)
          </h2>
          <ul className="space-y-2 text-gray-700">
            <li>• El ranking muestra a todos los usuarios ordenados por puntos UP</li>
            <li>• Se actualiza en <strong>tiempo real</strong></li>
            <li>• Los primeros 3 lugares tienen iconos especiales:</li>
          </ul>
          <div className="flex gap-8 mt-3 ml-4">
            <span>🥇 1° lugar: Corona dorada</span>
            <span>🥈 2° lugar: Medalla plateada</span>
            <span>🥉 3° lugar: Medalla bronce</span>
          </div>
        </section>

        {/* Consejos */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            💡 Consejos para Maximizar tus UP
          </h2>
          <div className="bg-green-50 border border-green-200 rounded-sm p-4">
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li><strong>Entrega antes del deadline</strong> - Obtén +3 UP extra cada vez</li>
              <li><strong>Mantén tu racha</strong> - Cada 5 entregas a tiempo = +10 UP bono</li>
              <li><strong>Calidad primero</strong> - Evita correcciones (-3 UP) y penalizaciones tardías (-5 UP)</li>
              <li><strong>Revisa antes de entregar</strong> - Una aprobación directa = +2 UP extra</li>
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            ❓ Preguntas Frecuentes
          </h2>
          <div className="space-y-4">
            <div>
              <p className="font-semibold text-gray-800">¿Cuándo se otorgan los puntos?</p>
              <p className="text-gray-600 ml-4">• <strong>Creadores:</strong> Al marcar contenido como "Grabado"</p>
              <p className="text-gray-600 ml-4">• <strong>Editores:</strong> Al marcar contenido como "Entregado"</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">¿Puedo perder niveles?</p>
              <p className="text-gray-600 ml-4">No directamente, pero si tus puntos bajan por penalizaciones, podrías descender de nivel</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">¿Los puntos expiran?</p>
              <p className="text-gray-600 ml-4">No, los puntos son permanentes</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">¿Qué pasa si el deadline no está definido?</p>
              <p className="text-gray-600 ml-4">Se considera como entrega a tiempo automáticamente</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-6 border-t-2 border-gray-200 text-center text-gray-500 text-sm">
          <p>© 2024 Creartor Studio - Todos los derechos reservados</p>
          <p className="mt-1">Documento generado el {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </footer>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body { 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .break-before-page {
            break-before: page;
          }
        }
      `}</style>
    </div>
  );
}
