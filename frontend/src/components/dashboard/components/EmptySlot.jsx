const EmptySlot = ({ posicion, onClickBench }) => {
  return (
    <div className="relative">
      <div className="w-24 h-32 bg-gray-200 border-2 border-dashed border-gray-400 rounded-lg flex flex-col items-center justify-center opacity-60 hover:opacity-80 transition-opacity">
        <div className="text-4xl mb-2">👤</div>
        <div className="text-xs font-semibold text-gray-600">{posicion}</div>
        <div className="text-xs text-gray-500">Vacío</div>
      </div>

      {onClickBench && (
        <button
          onClick={onClickBench}
          className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded-full shadow-lg transition-colors whitespace-nowrap"
          title="Añadir desde banquillo"
        >
          + Añadir
        </button>
      )}
    </div>
  );
};

export default EmptySlot;
