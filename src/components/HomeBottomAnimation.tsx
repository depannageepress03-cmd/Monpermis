/** Bandeau bas : vraie voiture qui roule sur une route animée. */
export function HomeBottomAnimation() {
  return (
    <div className="home-bottom-anim" aria-hidden="true">
      <div className="home-bottom-anim-scene">
        <img
          src="/home/car-clean.png"
          alt=""
          className="home-bottom-anim-car-img"
        />
        <div className="home-bottom-anim-road">
          <div className="home-bottom-anim-dashes">
            {Array.from({ length: 16 }).map((_, i) => (
              <span key={i} className="home-bottom-anim-dash" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
