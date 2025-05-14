interface DefaultButtonProps{
    onClick: () => void;
    disabled?: boolean,
    children: React.ReactNode
}

export default function Button({onClick, disabled = false, children}: DefaultButtonProps) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={` self-center bg-(--button-primary) hover:bg-(--button-hover) transition-all duration-200 text-white font-semibold py-2 px-16 rounded-4xl cursor-pointer ${!disabled ? 'opacity-100' : 'opacity-50'} ${!disabled ? ' hover:bg-(--button-hover)' : ''} ${!disabled ? 'cursor-pointer' : 'cursor-auto'}`}
        >
            {children}
        </button>
    )
}
