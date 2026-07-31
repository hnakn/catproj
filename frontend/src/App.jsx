import { useEffect, useMemo, useState } from 'react';
import { api } from './services/api';
import './index.css';
import './scanner.css';

const S = ({ v }) => <span className={`status ${v}`}>{v}</span>;
const T = ({ title, heads, rows }) => (
  <section className="panel">
    <div className="section-head">
      <h2>{title}</h2>
    </div>
    <table>
      <thead>
        <tr>
          {heads.map(x => (
            <th key={x}>{x}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((x, j) => (
              <td key={j}>{x}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </section>
);

function Notifications({ rows, admin }) {
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>Return notifications</h2>
          <p>Rentals ending within the next three days.</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="loading">No upcoming return alerts.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Equipment</th>
              {admin && (
                <>
                  <th>Customer</th>
                  <th>Site</th>
                </>
              )}
              <th>Return date</th>
              <th>Time remaining</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(x => (
              <tr key={x.request_id}>
                <td>{x.equipment_name}</td>
                {admin && (
                  <>
                    <td>{x.customer_name}</td>
                    <td>{x.site_name}</td>
                  </>
                )}
                <td>{x.end_date}</td>
                <td>{x.days_remaining === 0 ? 'Due today' : `${x.days_remaining} day(s)`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Equipment({ items }) {
  const sites = useMemo(
    () =>
      Object.values(
        items.reduce((a, x) => {
          const k = x.site_name || 'unassigned',
            v = a[k] || { site: k, count: 0, r: 0, i: 0, f: 0 };
          v.count++;
          v.r += +x.runtime_hours || 0;
          v.i += +x.idle_hours || 0;
          v.f += +x.fuel_consumption || 0;
          a[k] = v;
          return a;
        }, {})
      ),
    [items]
  );
  return (
    <>
      <T
        title="Equipment totals across all logs"
        heads={['Equipment', 'Status', 'Last location', 'Total runtime', 'Total idle', 'Total fuel', 'Total rented', 'Last log']}
        rows={items.map(x => [
          x.equipment_name,
          <S v={x.status} />,
          x.latitude ? `${x.latitude}, ${x.longitude}` : 'No log',
          `${x.runtime_hours || 0} h`,
          `${x.idle_hours || 0} h`,
          `${x.fuel_consumption || 0} L`,
          `${x.total_rented_hours || 0} h`,
          x.log_timestamp ? new Date(x.log_timestamp).toLocaleString() : 'No log',
        ])}
      />
      <T
        title="Usage per site"
        heads={['Site', 'Units', 'Runtime', 'Idle', 'Fuel']}
        rows={sites.map(x => [x.site, x.count, `${x.r.toFixed(2)} h`, `${x.i.toFixed(2)} h`, `${x.f.toFixed(2)} L`])}
      />
    </>
  );
}

function Scanner({ customerId }) {
  const [t, setT] = useState(''),
    [mode, setM] = useState(customerId ? 'customer/rfid/delivery' : 'admin/rfid/dispatch'),
    [latitude, setLatitude] = useState(''),
    [longitude, setLongitude] = useState(''),
    [out, setO] = useState(null);
  const needsLocation = mode !== 'admin/rfid/dispatch';
  const go = async e => {
    e.preventDefault();
    try {
      setO(await api.rfid(mode, { rfidTag: t, customerId, latitude, longitude }));
    } catch (x) {
      setO({ status: 'failed', steps: [x.message] });
    }
  };
  const changeMode = e => {
    setM(e.target.value);
    setO(null);
  };
  return (
    <section className="panel request-form scanner">
      <div className="section-head">
        <div>
          <h2>RFID Scanner</h2>
          <p>
            {needsLocation
              ? 'Enter the mock GPS reading captured at this scan. It will be saved to the equipment log.'
              : 'Validate an approved equipment dispatch.'}
          </p>
        </div>
      </div>
      <form onSubmit={go}>
        <label>
          Workflow
          <select value={mode} onChange={changeMode}>
            {customerId ? (
              <>
                <option value="customer/rfid/delivery">Receive equipment</option>
                <option value="customer/rfid/return">Initiate return</option>
              </>
            ) : (
              <>
                <option value="admin/rfid/dispatch">Dispatch equipment</option>
                <option value="admin/rfid/depot-return">Accept depot return</option>
              </>
            )}
          </select>
        </label>
        <label>
          RFID tag
          <input value={t} required placeholder="e.g. rfid10" onChange={e => setT(e.target.value)} />
        </label>
        {needsLocation && (
          <>
            <label>
              Mock latitude
              <input
                type="number"
                step="0.000001"
                required
                value={latitude}
                placeholder={mode === 'admin/rfid/depot-return' ? '11.000000' : 'Site latitude'}
                onChange={e => setLatitude(e.target.value)}
              />
            </label>
            <label>
              Mock longitude
              <input
                type="number"
                step="0.000001"
                required
                value={longitude}
                placeholder={mode === 'admin/rfid/depot-return' ? '76.900000' : 'Site longitude'}
                onChange={e => setLongitude(e.target.value)}
              />
            </label>
          </>
        )}
        <button className="primary">Scan RFID</button>
        {out && (
          <div className={`scan-result ${out.status === 'failed' ? 'failed' : 'passed'}`}>
            <div className="scan-result-title">
              <span>{out.status === 'failed' ? 'Scan failed' : 'Scan successful'}</span>
              <S v={out.status} />
            </div>
            {out.steps.map((x, i) => (
              <p className={out.status === 'failed' && i === out.steps.length - 1 ? 'failure-step' : ''} key={i}>
                <i>{out.status === 'failed' && i === out.steps.length - 1 ? '✕' : '✓'}</i>
                {x}
              </p>
            ))}
          </div>
        )}
      </form>
    </section>
  );
}

function NewRequest({ id, sites, done }) {
  const [f, setF] = useState({ siteId: sites[0]?.site_id || '', equipmentType: 'excavator', startDate: '', endDate: '' }),
    [msg, setMsg] = useState('');
  const go = async e => {
    e.preventDefault();
    try {
      await api.createRequest({ ...f, customerId: id });
      setMsg('Request created successfully');
      setTimeout(done, 500);
    } catch (x) {
      setMsg(x.message);
    }
  };
  return (
    <section className="panel request-form">
      <div className="section-head">
        <h2>New Request</h2>
      </div>
      <form onSubmit={go}>
        <label>
          Site
          <select value={f.siteId} onChange={e => setF({ ...f, siteId: e.target.value })}>
            {sites.map(x => (
              <option key={x.site_id} value={x.site_id}>
                {x.site_name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Equipment
          <input value={f.equipmentType} onChange={e => setF({ ...f, equipmentType: e.target.value })} />
        </label>
        <label>
          Start
          <input required type="date" onChange={e => setF({ ...f, startDate: e.target.value })} />
        </label>
        <label>
          End
          <input required type="date" onChange={e => setF({ ...f, endDate: e.target.value })} />
        </label>
        <button className="primary">Create Request</button>
        {msg && <small className="form-feedback">{msg}</small>}
      </form>
    </section>
  );
}

function Rentals({ items, refresh }) {
  const [d, setD] = useState({}),
    [msg, setMsg] = useState('');
  const go = async r => {
    try {
      const x = await api.extendRequest(r.request_id, +d[r.request_id] || 1);
      setMsg(x.message);
      refresh();
    } catch (e) {
      setMsg(e.message);
    }
  };
  return (
    <section className="panel">
      <div className="section-head">
        <h2>Rented Equipment</h2>
      </div>
      {msg && <div className="message">{msg}</div>}
      <table>
        <thead>
          <tr>
            <th>Equipment</th>
            <th>Status</th>
            <th>End</th>
            <th>Days</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <tr key={r.request_id}>
              <td>{r.equipment_name}</td>
              <td>
                <S v={r.status} />
              </td>
              <td>{r.end_date}</td>
              <td>
                <select value={d[r.request_id] || 1} onChange={e => setD({ ...d, [r.request_id]: e.target.value })}>
                  {[1, 2, 3, 4, 5, 6, 7].map(x => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </td>
              <td>
                <button className="primary extension-button" onClick={() => go(r)}>
                  Request Extension
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Layout({ items, p, setP, back, children }) {
  return (
    <div className="app-shell">
      <aside>
        <div className="brand">
          <div className="brand-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="brand-text">FLEET<b>BOT</b></span>
        </div>
        <nav>
          {items.map(x => (
            <button key={x} className={p === x ? 'active' : ''} onClick={() => setP(x)}>
              <span className="nav-dot"></span>
              {x}
            </button>
          ))}
        </nav>
        <button className="back" onClick={back}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: 6}}>
            <path d="M9 14L4 9l5-5M4 9h16" />
          </svg>
          Switch portal
        </button>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function Admin({ back }) {
  const [p, setP] = useState('Overview'),
    [d, setD] = useState({ equipment: [], requests: [], customers: [], dashboard: {}, notifications: [] });
  const load = () =>
    Promise.all([api.equipment(), api.requests(), api.customers(), api.dashboard(), api.adminNotifications()]).then(
      ([equipment, requests, customers, dashboard, notifications]) =>
        setD({ equipment, requests, customers, dashboard, notifications })
    );
  useEffect(() => {
    load();
  }, []);
  const latest = d.dashboard.latestLogs || [];
  const overview = (
    <>
      <section className="stats three">
        {[
          ['Total', d.dashboard.totalEquipment],
          ['Free', d.dashboard.availableEquipment],
          ['Occupied', d.dashboard.activeEquipment],
        ].map(x => (
          <div className="stat" key={x[0]}>
            <p>{x[0]} equipment</p>
            <strong>{x[1] || 0}</strong>
          </div>
        ))}
      </section>
      <T
        title="Latest day equipment logs"
        heads={['Equipment', 'Type', 'Status', 'Location', 'Runtime', 'Idle', 'Fuel', 'Logged']}
        rows={latest.map(x => [
          x.equipment_name,
          x.equipment_type,
          <S v={x.status} />,
          `${x.latitude}, ${x.longitude}`,
          `${x.runtime_hours || 0} h`,
          `${x.idle_hours || 0} h`,
          `${x.fuel_consumption || 0} L`,
          new Date(x.log_timestamp).toLocaleString(),
        ])}
      />
    </>
  );
  const body =
    p === 'Equipment' ? (
      <Equipment items={d.equipment} />
    ) : p === 'Requests' ? (
      <T
        title="Requests"
        heads={['Customer', 'Site', 'Equipment', 'Status', 'Action']}
        rows={d.requests.map(x => [
          x.customer_name,
          x.site_name,
          x.equipment_type,
          <S v={x.status} />,
          x.status === 'pending' ? (
            <button className="primary action-btn" onClick={() => api.approveRequest(x.request_id).then(load)}>
              Approve
            </button>
          ) : (
            ''
          ),
        ])}
      />
    ) : p === 'Customers' ? (
      <T
        title="Customers"
        heads={['ID', 'Name', 'Sites']}
        rows={d.customers.map(x => [x.customer_id, x.customer_name, x.sites])}
      />
    ) : p === 'Notifications' ? (
      <Notifications rows={d.notifications} admin />
    ) : p === 'Analytics' ? (
      <section className="panel customer-welcome">
        <h2>Analytics</h2>
        <p>Telemetry trends & maintenance analytics coming soon.</p>
      </section>
    ) : p === 'Depot Scanner' ? (
      <Scanner />
    ) : (
      overview
    );
  return (
    <Layout items={['Overview', 'Equipment', 'Requests', 'Customers', 'Notifications', 'Analytics', 'Depot Scanner']} p={p} setP={setP} back={back}>
      <header>
        <div>
          <span className="portal-badge">ADMINISTRATION</span>
          <h1>{p}</h1>
        </div>
      </header>
      {body}
    </Layout>
  );
}

function Customer({ back }) {
  const [p, setP] = useState('Home'),
    [cs, setCs] = useState([]),
    [id, setId] = useState(''),
    [d, setD] = useState(null),
    [notifications, setNotifications] = useState([]);
  const load = () =>
    id &&
    Promise.all([api.customerPortal(id), api.customerNotifications(id)]).then(([portal, alerts]) => {
      setD(portal);
      setNotifications(alerts);
    });
  useEffect(() => {
    api.customers().then(x => {
      setCs(x);
      setId(x[0]?.customer_id);
    });
  }, []);
  useEffect(() => {
    load();
  }, [id]);

  const body = !d ? (
    <div className="loading">Loading fleet telemetry...</div>
  ) : p === 'Rented Equipment' ? (
    <Rentals items={d.equipment} refresh={load} />
  ) : p === 'New Request' ? (
    <NewRequest id={id} sites={d.sites} done={() => { load(); setP('My Requests'); }} />
  ) : p === 'My Sites' ? (
    <T title="My Sites" heads={['Site', 'Latitude', 'Longitude']} rows={d.sites.map(x => [x.site_name, x.latitude, x.longitude])} />
  ) : p === 'My Requests' ? (
    <T title="My Requests" heads={['Site', 'Equipment', 'Start', 'End', 'Status']} rows={d.requests.map(x => [x.site_name, x.equipment_type, x.start_date, x.end_date, <S v={x.status} />])} />
  ) : p === 'Notifications' ? (
    <Notifications rows={notifications} />
  ) : p === 'RFID Scanner' ? (
    <Scanner customerId={id} />
  ) : (
    <section className="stats three">
      <div className="stat">
        <p>Active Sites</p>
        <strong>{d.sites.length}</strong>
      </div>
      <div className="stat">
        <p>Active Rentals</p>
        <strong>{d.equipment.length}</strong>
      </div>
      <div className="stat">
        <p>Total Requests</p>
        <strong>{d.requests.length}</strong>
      </div>
    </section>
  );

  return (
    <Layout
      items={['Home', 'My Sites', 'Rented Equipment', 'My Requests', 'New Request', 'RFID Scanner', 'Notifications']}
      p={p}
      setP={setP}
      back={back}
    >
      <header>
        <div>
          <span className="portal-badge">CLIENT PORTAL</span>
          <h1>{p}</h1>
        </div>
        <div className="customer-selector">
          <label>Active Account:</label>
          <select value={id} onChange={e => setId(e.target.value)}>
            {cs.map(x => (
              <option key={x.customer_id} value={x.customer_id}>
                {x.customer_name}
              </option>
            ))}
          </select>
        </div>
      </header>
      {body}
    </Layout>
  );
}

export default function App() {
  const [r, setR] = useState('home');
  return r === 'home' ? (
    <main className="landing">
      <div className="landing-content">
        <div className="landing-badge">
          <span className="pulse-dot"></span> FLEETBOT INTELLIGENCE PLATFORM
        </div>
        <h1>FLEETBOT</h1>
        <p>Next-generation equipment rental, IoT telemetry monitoring, and automated depot dispatch platform.</p>
        <div className="role-cards">
          <button onClick={() => setR('admin')}>
            <div className="card-header">
              <div className="icon-wrapper admin-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
              </div>
              <span className="card-badge">ADMIN</span>
            </div>
            <h2>Admin Portal</h2>
            <p>Fleet telemetry, equipment dispatch, rental requests & depot controls.</p>
            <span className="card-arrow">Enter Dashboard →</span>
          </button>
          <button onClick={() => setR('customer')}>
            <div className="card-header">
              <div className="icon-wrapper client-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <span className="card-badge">CLIENT</span>
            </div>
            <h2>Customer Portal</h2>
            <p>Manage job sites, rent equipment, scan delivery tags & extend rentals.</p>
            <span className="card-arrow">Enter Portal →</span>
          </button>
        </div>
      </div>
    </main>
  ) : r === 'admin' ? (
    <Admin back={() => setR('home')} />
  ) : (
    <Customer back={() => setR('home')} />
  );
}

